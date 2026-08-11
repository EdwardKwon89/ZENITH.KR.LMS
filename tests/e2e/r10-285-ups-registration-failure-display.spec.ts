import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import fs from 'fs';
import path from 'path';

// R-10 TASK-B-285 (Issue #1071): UPS 등록 실패 상세 노출 — AGENCY 실제 로그인 → ups-receive 네비게이션 검증
// 필수 검증 항목(2026-07-22 신설): 역할·조직유형 한정 화면은 실제 로그인 + page.goto() 네비게이션으로
// rbac.ts STATIC_PERMISSIONS와 proxy.ts 화이트리스트 일치 여부를 확인한다.
//
// 자기완결형: AGENCY 사용자·조직·하위화주·WAREHOUSED 오더·등록 실패 이력을 생성하고 afterAll에서 정리.
// AGENCY 사용자 app_metadata는 r10-tb267 검증 패턴(createUser → updateUserById app_metadata → profile upsert) 사용.
// 사전 조건: ① dev 서버(baseURL) 실행 ② iss1071 마이그레이션 적용(AGENCY SELECT RLS).

const BASE = process.env.PW_BASE_URL || 'http://localhost:3010';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_285_Result';
const AGENCY_EMAIL = 'r10-285-agency@zenith.kr';
const AGENCY_PASSWORD = 'password1234';
const AGENCY_ORG_NAME = 'R10-285 Agency';
const SHIPPER_ORG_NAME = 'R10-285 Downstream Shipper';
const ORDER_NO = 'ZEN-R10-285';

test.describe('R-10 TASK-B-285: UPS 등록 실패 배지 + 결과 모달', () => {
  let agencyOrgId: string | null = null;
  let shipperOrgId: string | null = null;

  test.beforeAll(async () => {
    const supabase = getServiceClient();
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // 사전 정리 (재실행 자기치유): 잔존 오더/에러/조직/사용자 제거
    const { data: prevOrder } = await supabase.from('zen_orders').select('id').eq('order_no', ORDER_NO).maybeSingle();
    if (prevOrder) {
      await supabase.from('zen_ups_label_errors').delete().eq('order_id', prevOrder.id);
      await supabase.from('zen_orders').delete().eq('id', prevOrder.id);
    }
    const { data: prevAgencyOrgs } = await supabase.from('zen_organizations').select('id').in('name', [AGENCY_ORG_NAME, SHIPPER_ORG_NAME]);
    if (prevAgencyOrgs && prevAgencyOrgs.length > 0) {
      const ids = prevAgencyOrgs.map((o: any) => o.id);
      await supabase.from('zen_agency_shippers').delete().or(`agency_org_id.in.(${ids.join(',')}),shipper_org_id.in.(${ids.join(',')})`);
      await supabase.from('zen_organizations').delete().in('id', ids);
    }
    const { data: usersRes } = await supabase.auth.admin.listUsers();
    const prevUser = (usersRes?.users || []).find((u: any) => u.email === AGENCY_EMAIL);
    if (prevUser) {
      await supabase.from('zen_profiles').delete().eq('email', AGENCY_EMAIL);
      await supabase.auth.admin.deleteUser(prevUser.id);
    }

    // AGENCY 조직 + 하위 화주 조직
    const { data: agencyOrg } = await supabase.from('zen_organizations').insert({
      name: AGENCY_ORG_NAME, type: 'AGENCY', status: 'ACTIVE',
      rep_name: 'R10대표', contact_phone: '010-2850-2850',
    }).select().single();
    const { data: shipperOrg } = await supabase.from('zen_organizations').insert({
      name: SHIPPER_ORG_NAME, type: 'SHIPPER', status: 'ACTIVE',
    }).select().single();
    agencyOrgId = agencyOrg.id;
    shipperOrgId = shipperOrg.id;

    // AGENCY 사용자 (app_metadata에 role/org_id 동기화)
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: AGENCY_EMAIL, password: AGENCY_PASSWORD, email_confirm: true,
      user_metadata: { full_name: 'R10-285 Agency', role: 'AGENCY' },
    });
    if (!authUser?.user) throw new Error('AGENCY user creation failed');
    await supabase.auth.admin.updateUserById(authUser.user.id, {
      app_metadata: { role: 'AGENCY', org_id: agencyOrgId, status: 'ACTIVE', org_type: 'AGENCY' },
    });
    await supabase.from('zen_profiles').upsert({
      id: authUser.user.id, org_id: agencyOrgId, email: AGENCY_EMAIL,
      full_name: 'R10-285 Agency', role: 'AGENCY', status: 'ACTIVE',
    }, { onConflict: 'id' });

    // 대리점 ↔ 하위 화주 (getWarehousedOrders의 shipper 필터 통과용)
    await supabase.from('zen_agency_shippers').insert({
      agency_org_id: agencyOrgId, shipper_org_id: shipperOrgId, shipper_type: 'CORPORATE',
    });

    // WAREHOUSED UPS 오더 + 등록 실패 이력
    const { data: order } = await supabase.from('zen_orders').insert({
      order_no: ORDER_NO, shipper_id: shipperOrgId, agency_org_id: agencyOrgId,
      transport_mode: 'UPS', status: 'WAREHOUSED',
      recipient_name: '김십오', recipient_phone: '010-2850-2850',
      recipient_city: 'Seoul', recipient_country_code: 'KR', recipient_address: '서울시 테스트구',
      cargo_details: {},
    }).select().single();
    await supabase.from('zen_ups_label_errors').insert({
      order_id: order.id, shxk_code: 'FAIL',
      error_message: '收件人城市不能为空 (받는 사람 도시 필수)',
    });
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    const { data: curOrder } = await supabase.from('zen_orders').select('id').eq('order_no', ORDER_NO).maybeSingle();
    if (curOrder) {
      await supabase.from('zen_ups_label_errors').delete().eq('order_id', curOrder.id);
      await supabase.from('zen_orders').delete().eq('id', curOrder.id);
    }
    if (agencyOrgId) await supabase.from('zen_agency_shippers').delete().eq('agency_org_id', agencyOrgId);
    await supabase.from('zen_profiles').delete().eq('email', AGENCY_EMAIL);
    const { data: usersRes } = await supabase.auth.admin.listUsers();
    const u = (usersRes?.users || []).find((au: any) => au.email === AGENCY_EMAIL);
    if (u) await supabase.auth.admin.deleteUser(u.id);
    const orgIds = [agencyOrgId, shipperOrgId].filter(Boolean);
    if (orgIds.length) await supabase.from('zen_organizations').delete().in('id', orgIds);
  });

  test('AGENCY 로그인 → ups-receive 실패 배지 노출 → 배치 등록 결과 모달 → 수정 링크', async ({ page }) => {
    test.setTimeout(120000);
    page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));

    // 1) AGENCY 로그인
    await page.goto(`${BASE}/ko/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', AGENCY_EMAIL);
    await page.fill('input[name="password"]', AGENCY_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_agency_login_success.png') });

    // 2) ups-receive 페이지 네비게이션 (proxy.ts 화이트리스트 경유)
    await page.goto(`${BASE}/ko/warehouse/ups-receive`);
    await page.waitForLoadState('networkidle');

    // 3) 픽스처 오더 + 실패 배지 확인
    await expect(page.locator(`text=${ORDER_NO}`)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=⚠ 최근 등록 실패')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_queue_fail_badge.png'), fullPage: true });

    // 4) 오더 선택 → 배치 등록 확정
    await page.locator(`text=${ORDER_NO}`).click();
    await page.locator('button:has-text("UPS 등록 확정")').click();

    // 5) 결과 모달: 실패 사유 + 성공/실패 뱃지 + 수정 링크
    await expect(page.locator('text=UPS 등록 결과')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text="실패"')).toBeVisible();
    const errMsg = page.locator('div.fixed.inset-0 p.text-red-700').first();
    await expect(errMsg).toBeVisible();
    expect((await errMsg.innerText()).trim().length).toBeGreaterThan(0);
    const editLink = page.locator('a:has-text("수정하기")').first();
    await expect(editLink).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_results_modal.png'), fullPage: true });

    // 6) 수정 링크 → /orders/<id>/edit 배선 확인
    const href = await editLink.getAttribute('href');
    expect(href).toMatch(/^\/orders\/[0-9a-f-]+\/edit$/);

    // 7) 결과 모달 닫기
    await page.locator('button:has-text("확인")').click();
  });
});
