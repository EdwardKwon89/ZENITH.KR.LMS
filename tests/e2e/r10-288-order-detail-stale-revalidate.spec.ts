import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import fs from 'fs';
import path from 'path';

// R-10 TASK-B-288 (Issue #1077 / DEF-B-057): UPS 등록취소(undoUpsRegistration) 후
// 오더 상세 페이지 UPS 등록 카드 stale 제거 검증
//
// 시나리오 (task 체크리스트):
//   오더 상세 페이지에 UPS 등록 카드 표시 → 창고(outbound)에서 UPS접수취소 실행
//   → 상세 페이지로 복귀 시 새로고침 없이 UPS 등록 카드 제거 확인
//
// 사전 조건:
//   ① dev 서버(3010, fix 포함) + SHXK_TEST_MOCK=true (removeorder 성공 결정적 재현)
//   ② supabase 로컬 + admin@zenith.kr 시드 계정 (docs/00_GUIDE/103_AGENT_ROLES_SPEC.md 5-1)
//
// 자기완결형: SHIPPER 조직·PACKED UPS 오더·UPS 라벨 픽스처 생성 후 afterAll에서 정리.

const BASE = process.env.PW_BASE_URL || 'http://localhost:3010';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_288_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_ORG_NAME = 'R10-288 Shipper';
const ORDER_NO = 'ZEN-TB288';

let orderId: string | null = null;
let shipperOrgId: string | null = null;

test.describe('R-10 TASK-B-288: UPS 등록취소 후 오더 상세 카드 제거 (DEF-B-057)', () => {
  test.beforeAll(async () => {
    const supabase = getServiceClient();
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // 사전 정리 (재실행 자기치유)
    const { data: prevOrder } = await supabase.from('zen_orders').select('id').eq('order_no', ORDER_NO).maybeSingle();
    if (prevOrder) {
      await supabase.from('zen_ups_labels').delete().eq('order_id', prevOrder.id);
      await supabase.from('zen_orders').delete().eq('id', prevOrder.id);
    }
    const { data: prevOrg } = await supabase.from('zen_organizations').select('id').eq('name', SHIPPER_ORG_NAME).maybeSingle();
    if (prevOrg) {
      await supabase.from('zen_organizations').delete().eq('id', prevOrg.id);
    }

    // SHIPPER 조직
    const { data: shipperOrg } = await supabase.from('zen_organizations').insert({
      name: SHIPPER_ORG_NAME, type: 'SHIPPER', status: 'ACTIVE',
    }).select().single();
    if (!shipperOrg) throw new Error('SHIPPER org creation failed');
    shipperOrgId = shipperOrg.id;

    // PACKED UPS 오더 (undoUpsRegistration: status===PACKED 필수)
    const { data: order } = await supabase.from('zen_orders').insert({
      order_no: ORDER_NO, shipper_id: shipperOrgId,
      transport_mode: 'UPS', status: 'PACKED',
      recipient_name: '김팔팔', recipient_phone: '010-2888-2888',
      recipient_city: 'Seoul', recipient_country_code: 'KR', recipient_address: '서울시 테스트구',
      cargo_details: {},
    }).select().single();
    if (!order) throw new Error('order creation failed');
    orderId = order.id;

    // 활성 UPS 라벨 (hasActiveLabel=true → 상세 페이지 카드 노출 조건)
    const now = Date.now();
    await supabase.from('zen_ups_labels').insert({
      order_id: orderId,
      reference_no: `TB288REF-${now}`,
      tracking_number: `1Z999AA1${now.toString().slice(-8)}`,
      label_format: 'PDF',
      storage_path: '/test/e2e288_label.pdf',
      file_size_bytes: 1024,
    });
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    if (orderId) {
      await supabase.from('zen_ups_labels').delete().eq('order_id', orderId);
      await supabase.from('zen_orders').delete().eq('id', orderId);
    }
    if (shipperOrgId) await supabase.from('zen_organizations').delete().eq('id', shipperOrgId);
  });

  test('상세 카드 표시 → 창고 UPS접수취소 → 상세 카드 제거 (새로고침 없음)', async ({ page }) => {
    test.setTimeout(120000);
    page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));
    const supabase = getServiceClient();
    if (!orderId) throw new Error('orderId missing');

    // 1) ADMIN 로그인
    await page.goto(`${BASE}/ko/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_admin_login.png') });

    // 2) 오더 상세 페이지 — UPS 등록 카드(UPS등록취소 버튼) 노출 확인
    await page.goto(`${BASE}/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    const cancelBtn = page.getByRole('button', { name: 'UPS등록취소' });
    await expect(cancelBtn).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_detail_ups_card_visible.png'), fullPage: true });

    // 3) 창고 outbound 페이지 — PACKED 오더 선택 → UPS접수취소 실행
    await page.goto(`${BASE}/ko/warehouse/outbound`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('div.cursor-pointer', { hasText: ORDER_NO }).first()).toBeVisible({ timeout: 20000 });

    // 오더 카드 선택 (배치 취소 버튼 노출 조건)
    await page.locator('div.cursor-pointer', { hasText: ORDER_NO }).first().click();
    const undoBatchBtn = page.getByRole('button', { name: 'UPS접수취소' });
    await expect(undoBatchBtn).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_outbound_selected.png'), fullPage: true });
    await undoBatchBtn.click();

    // 확인 모달
    const confirmBtn = page.getByRole('button', { name: '접수취소 확정' });
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_undo_confirm_modal.png'), fullPage: true });
    await confirmBtn.click();

    // 4) DB 확정: PACKED → WAREHOUSED, 라벨 0건 (서버 액션 + SHXK mock removeorder 성공)
    await page.waitForTimeout(3000);
    const { data: dbOrder } = await supabase.from('zen_orders').select('status').eq('id', orderId).maybeSingle();
    expect(dbOrder?.status).toBe('WAREHOUSED');
    const { count: labelCount } = await supabase
      .from('zen_ups_labels')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId);
    expect(labelCount).toBe(0);

    // 5) 오더 상세 페이지 복귀 — UPS 등록 카드 제거 (새로고침 없는 재네비게이션)
    await page.goto(`${BASE}/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await expect(cancelBtn).not.toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_detail_ups_card_gone.png'), fullPage: true });
  });
});
