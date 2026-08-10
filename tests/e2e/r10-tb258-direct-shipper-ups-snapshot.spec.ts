import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-258 / Issue #1007 / DEF-B-035 — R-10 실브라우저 검증 ─────────────
//
// 목적: 비대리점 직접 화주(SHIPPER role, zen_agency_shippers 미소속) 계정으로
// 실제 브라우저에서 UPS 오더 1건을 등록한 뒤, zen_order_rate_snapshots에
// 스냅샷 행이 생성됐는지 DB에서 직접 확인한다.
// (기존 결함: role === AGENCY_SHIPPER일 때만 스냅샷 생성 → 직접 화주는 미생성)

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_258_Result';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

// 비대리점 직접 화주 신규 생성 계정 (zen_agency_shippers에 링크 없음) — role=CORPORATE
const SHIPPER_EMAIL = 'r10_direct_shipper_258@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';
const ORG_NAME = 'R10 Direct Shipper Corp (258)';

let supabase: ReturnType<typeof createClient>;
let shipperOrgId: string;

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function setupTestData() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  supabase = createClient(SUPABASE_URL, key);

  // 1) 이전 실행 잔여 데이터 정리
  const emails = [SHIPPER_EMAIL];
  const { data: profiles } = await supabase.from('zen_profiles').select('id').in('email', emails);
  if (profiles && profiles.length > 0) {
    await supabase.from('zen_profiles').delete().in('email', emails);
  }
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  for (const email of emails) {
    const u = (authUsersRes?.users || []).find((au: any) => au.email === email);
    if (u) await supabase.auth.admin.deleteUser(u.id);
  }

  const { data: existingOrg } = await supabase.from('zen_organizations').select('id').eq('name', ORG_NAME);
  if (existingOrg && existingOrg.length > 0) {
    await supabase.from('zen_orders').delete().in('shipper_id', existingOrg.map((o: any) => o.id));
    await supabase.from('zen_organizations').delete().in('id', existingOrg.map((o: any) => o.id));
  }

  // 2) 비대리점 SHIPPER 조직 신규 생성 — zen_agency_shippers 링크를 만들지 않는다
  const { data: org, error: orgErr } = await supabase.from('zen_organizations').insert({
    name: ORG_NAME, type: 'SHIPPER', status: 'ACTIVE',
  }).select().single();
  if (orgErr) throw new Error(`org insert failed: ${orgErr.message}`);
  shipperOrgId = org.id;

  // 3) 계정 생성 (role=SHIPPER — 직접 화주, 대리점 소속 아님)
  const { data: authUser } = await supabase.auth.admin.createUser({
    email: SHIPPER_EMAIL, password: SHIPPER_PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'R10 Direct Shipper', role: 'CORPORATE' },
  });
  if (authUser?.user) {
    await supabase.auth.admin.updateUserById(authUser.user.id, {
      app_metadata: { role: 'CORPORATE', org_id: shipperOrgId, status: 'ACTIVE', org_type: 'SHIPPER' },
    });
    await supabase.from('zen_profiles').upsert({
      id: authUser.user.id, org_id: shipperOrgId, email: SHIPPER_EMAIL,
      full_name: 'R10 Direct Shipper', role: 'CORPORATE', status: 'ACTIVE',
    }, { onConflict: 'id' });
  }
}

async function cleanupTestData() {
  const emails = [SHIPPER_EMAIL];
  const { data: profiles } = await supabase.from('zen_profiles').select('id').in('email', emails);
  if (profiles && profiles.length > 0) {
    await supabase.from('zen_profiles').delete().in('email', emails);
  }
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  for (const email of emails) {
    const u = (authUsersRes?.users || []).find((au: any) => au.email === email);
    if (u) await supabase.auth.admin.deleteUser(u.id);
  }
  const { data: existingOrg } = await supabase.from('zen_organizations').select('id').eq('name', ORG_NAME);
  if (existingOrg && existingOrg.length > 0) {
    await supabase.from('zen_orders').delete().in('shipper_id', existingOrg.map((o: any) => o.id));
    await supabase.from('zen_organizations').delete().in('id', existingOrg.map((o: any) => o.id));
  }
}

async function loginAs(page: any, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  try {
    await page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 });
  } catch {
    console.log('Login redirect timed out, continuing...');
  }
}

async function createUpsDirectOrder(page: any) {
  // 오더 등록 화면 → UPS Direct 모드 선택
  await page.goto('/ko/orders/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('button:has-text("UPS Direct")', { timeout: 30000 });
  await page.locator('button:has-text("UPS Direct")').click();
  await page.waitForTimeout(500);

  // 수취인 정보 탭 클릭 (기본정보/수하인 정보 탭 전환)
  const recipientTab = page.locator('button:has-text("수하인 정보")').first();
  if (await recipientTab.count()) {
    await recipientTab.click();
    await page.waitForTimeout(500);
  }

  // 수취인 정보 (UPS는 port 미사용 — recipient_country_code 필수)
  await page.fill('input[name="recipient_name"]', 'John Doe');
  await page.fill('input[name="recipient_phone"]', '12135551234');

  // 수취인 국가 US 선택 (AddressInput select — recipient_country_code 셋업)
  // 국가를 US로 바꿔야 address 필드가 편집 가능한 street address로 전환된다(KR은 주소검색 readOnly)
  const countrySelect = page.locator('select:visible').filter({ has: page.locator('option:has-text("United States")') }).first();
  if (await countrySelect.count()) {
    const usOption = await countrySelect.locator('option:has-text("United States")').first().textContent();
    if (usOption) {
      await countrySelect.selectOption({ label: usOption.trim() });
      await page.waitForTimeout(500);
    }
  }
  await page.fill('[name="recipient_address"]', '123 Main St, Los Angeles, CA 90001');

  // 패키지 1개 (UPS 모드에서는 packing_unit 대신 content_type 사용)
  const contentTypeSelect = page.locator('select[name="packages.0.content_type"]');
  if (await contentTypeSelect.count()) {
    await contentTypeSelect.selectOption('NONDOC');
  }
  await page.fill('input[name="packages.0.packing_count"]', '1');
  await page.fill('input[name="packages.0.length"]', '10');
  await page.fill('input[name="packages.0.width"]', '10');
  await page.fill('input[name="packages.0.height"]', '10');
  await page.fill('input[name="packages.0.gross_weight"]', '5');
  await page.fill('input[name="packages.0.items.0.item_name"]', 'R10 Direct Shipment');
  await page.fill('input[name="packages.0.items.0.quantity"]', '1');
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_ups_direct_form_filled.png'), fullPage: true });

  // UPS 서비스 티어 선택 (UpsFreightEstimateSection — select에 name 없음, Saver 선택)
  const upsTierSelect = page.locator('select:visible').filter({ has: page.locator('option:has-text("Saver")') }).first();
  if (await upsTierSelect.count()) {
    await upsTierSelect.selectOption({ index: 2 });
    await page.waitForTimeout(1000);
  }

  // 오더 등록 버튼 클릭 (UPS direct submit)
  const submitBtn = page.locator('button:has-text("오더 등록")').first();
  await expect(submitBtn).toBeEnabled({ timeout: 10000 });
  await submitBtn.click();
}

test.describe('TASK-B-258 R-10: 비대리점 직접 화주 UPS 오더 → 스냅샷 생성 검증', () => {
  test.beforeAll(async () => {
    await ensureDir();
    await setupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('비대리점 SHIPPER 계정 UPS 오더 등록 → zen_order_rate_snapshots 행 생성 확인', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.waitForLoadState('networkidle');

    await createUpsDirectOrder(page);

    // 오더 상세로 이동하거나 성공 처리되면 orderId 추출
    let orderId: string | null = null;
    try {
      await page.waitForURL(/\/orders\/[a-f0-9-]{8,}/, { timeout: 30000 });
      const match = page.url().match(/\/orders\/([a-f0-9-]{8,})/);
      orderId = match ? match[1] : null;
    } catch {
      // 리다이렉트가 안 되면 페이지에서 로그/에러 캡처
      const body = await page.textContent('body');
      console.log('No redirect captured. Body snippet:', (body || '').slice(0, 500));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '99_no_redirect.png'), fullPage: true });
    }

    if (!orderId) {
      // 마지막 수단: 방금 생성된 SHIPPER 소속 UPS 오더 최신 1건 조회
      const { data: latest } = await supabase
        .from('zen_orders')
        .select('id, order_no, transport_mode, agency_org_id')
        .eq('shipper_id', shipperOrgId)
        .eq('transport_mode', 'UPS')
        .order('created_at', { ascending: false })
        .limit(1);
      orderId = latest && latest.length > 0 ? latest[0].id : null;
      if (!orderId) {
        throw new Error('UPS 오더가 생성되지 않았습니다. 오더 등록 실패 확인 필요.');
      }
    }

    // 생성된 오더의 agency_org_id는 null(대리점 미소속)이어야 함
    const { data: order } = await supabase
      .from('zen_orders')
      .select('id, order_no, transport_mode, agency_org_id, ups_product_code, recipient_country_code, dest_port_id')
      .eq('id', orderId)
      .single();
    console.log('R-10 DIAG order:', JSON.stringify(order));
    expect(order).toBeTruthy();
    expect(order.transport_mode).toBe('UPS');
    expect(order.agency_org_id).toBeNull();

    // 핵심 검증: zen_order_rate_snapshots에 해당 오더의 스냅샷 행이 존재해야 함
    const { data: snapshots, error: snapErr } = await supabase
      .from('zen_order_rate_snapshots')
      .select('order_id, applied_unit_price, applied_currency, applied_rule')
      .eq('order_id', orderId);

    console.log('Rate snapshots for order:', JSON.stringify(snapshots));
    console.log('Snapshot query error:', snapErr?.message ?? 'none');

    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_order_detail.png'), fullPage: true });

    expect(snapErr).toBeNull();
    expect(snapshots && snapshots.length).toBeGreaterThan(0);
    expect(snapshots![0].applied_rule).toBe('UPS_3TIER');
    console.log('R-10 PASSED: 비대리점 직접 화주 UPS 오더 스냅샷 생성 확인됨');
  });
});
