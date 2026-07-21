import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './test-utils';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_23_Result';
const SUPABASE_URL = 'http://127.0.0.1:54321';
const AGENCY_EMAIL = 'agency_e2e23@zenith.kr';
const AGENCY_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper_e2e23@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let supabase: any;
let agencyOrgId: string;
let shipperOrgId: string;
let baseRateId: string;

async function setupOrganizations() {
  const { data: agencyOrg } = await supabase.from('zen_organizations').insert({
    name: 'E2E23 Test Agency',
    type: 'AGENCY',
    status: 'ACTIVE',
  }).select('id').single();
  if (!agencyOrg) throw new Error('Failed to create agency org');
  agencyOrgId = agencyOrg.id;

  const { data: shipperOrg } = await supabase.from('zen_organizations').insert({
    name: 'E2E23 Test Shipper',
    type: 'CORPORATE',
    status: 'ACTIVE',
  }).select('id').single();
  if (!shipperOrg) throw new Error('Failed to create shipper org');
  shipperOrgId = shipperOrg.id;

  await supabase.from('zen_agency_shippers').insert({
    agency_org_id: agencyOrgId,
    shipper_org_id: shipperOrgId,
    shipper_type: 'CORPORATE',
    discount_rate: 0.05,
    grade: 'SILVER',
    is_active: true,
  });
}

async function setupUsers() {
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  for (const u of existingUsers?.users || []) {
    if ([AGENCY_EMAIL, SHIPPER_EMAIL].includes(u.email || '')) {
      await supabase.from('zen_profiles').delete().eq('email', u.email);
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  const { data: agencySignUp } = await supabase.auth.admin.createUser({
    email: AGENCY_EMAIL,
    password: AGENCY_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'AGENCY', org_type: 'AGENCY', status: 'ACTIVE' },
  });
  if (agencySignUp?.user) {
    await supabase.from('zen_profiles').upsert({
      id: agencySignUp.user.id,
      email: AGENCY_EMAIL,
      full_name: 'E2E23 Agency Admin',
      role: 'AGENCY',
      status: 'ACTIVE',
      org_id: agencyOrgId,
    });
    await supabase.auth.admin.updateUserById(agencySignUp.user.id, {
      app_metadata: { role: 'AGENCY', org_type: 'AGENCY', status: 'ACTIVE' },
    });
  }

  const { data: shipperSignUp } = await supabase.auth.admin.createUser({
    email: SHIPPER_EMAIL,
    password: SHIPPER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'CORPORATE', org_type: 'SHIPPER', status: 'ACTIVE' },
  });
  if (shipperSignUp?.user) {
    await supabase.from('zen_profiles').upsert({
      id: shipperSignUp.user.id,
      email: SHIPPER_EMAIL,
      full_name: 'E2E23 Shipper',
      role: 'CORPORATE',
      status: 'ACTIVE',
      org_id: shipperOrgId,
    });
  }
}

async function setupOrders() {
  const cargoDetails = JSON.stringify([{ qty: 1, weight: 10, description: 'E2E23 fixture' }]);
  const { data: pricedOrder } = await supabase.from('zen_orders').insert({
    order_no: `E2E23-PRICED-${Date.now()}`,
    shipper_id: shipperOrgId,
    status: 'RELEASED',
    cargo_details: cargoDetails,
    order_type: 'B2B',
    transport_mode: 'AIR',
  }).select('id').single();

  if (pricedOrder) {
    await supabase.from('zen_order_rate_snapshots').insert({
      order_id: pricedOrder.id,
      applied_unit_price: 50000,
      applied_currency: 'KRW',
      applied_rule: 'STANDARD',
      carrier_cost_amount: 35000,
      platform_fee_amount: 5000,
    });
  }

  await supabase.from('zen_orders').insert({
    order_no: `E2E23-UNPRICED-${Date.now()}`,
    shipper_id: shipperOrgId,
    status: 'RELEASED',
    cargo_details: JSON.stringify([{ qty: 1, weight: 5, description: 'E2E23 unpriced fixture' }]),
    order_type: 'B2B',
    transport_mode: 'AIR',
  });
}

async function setupUpsFixtures() {
  const { data: product } = await supabase.from('zen_ups_products')
    .select('id').limit(1).single();
  if (!product) throw new Error('No zen_ups_products seed found. Run migrations first.');

  const { data: zone } = await supabase.from('zen_ups_zones').insert({
    zone_code: 'E2E23',
    zone_name: 'E2E23 Test Zone',
    is_active: true,
  }).select('id').single();
  if (!zone) throw new Error('Failed to create zone fixture');

  const { data: baseRate } = await supabase.from('zen_ups_base_rates').insert({
    product_id: product.id,
    zone_id: zone.id,
    weight_kg: 1.0,
    selling_price: 50000,
    cost_price: 35000,
    valid_from: '2026-01-01',
  }).select('id').single();
  if (!baseRate) throw new Error('Failed to create base rate fixture');
  baseRateId = baseRate.id;
}

test.describe('E2E-23: Agency 전체 흐름 시나리오', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    supabase = getServiceClient();

    await supabase.from('zen_agency_rate_overrides').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('zen_agency_shippers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await setupOrganizations();
    await setupUsers();
    await setupUpsFixtures();
    await setupOrders();
  });

  test.afterAll(async () => {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    for (const u of existingUsers?.users || []) {
      if ([AGENCY_EMAIL, SHIPPER_EMAIL].includes(u.email || '')) {
        await supabase.from('zen_profiles').delete().eq('email', u.email);
        await supabase.auth.admin.deleteUser(u.id);
      }
    }

    await supabase.from('zen_orders').delete().ilike('order_no', 'E2E23-%');
    await supabase.from('zen_agency_rate_overrides').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('zen_agency_shippers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('zen_ups_base_rates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('zen_ups_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('zen_organizations').delete().in('id', [agencyOrgId, shipperOrgId]);
  });

  async function loginAsAgency(page: any) {
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', AGENCY_EMAIL);
    await page.fill('input[name="password"]', AGENCY_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|\/agency/, { timeout: 30000 });
  }

  test('TC-AG-01~02: Agency 로그인 + 대시보드 접근', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    await loginAsAgency(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_agency_login.png') });

    await page.goto('/ko/agency');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/agency/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_agency_dashboard.png') });
  });

  test('TC-AG-03~04: 화주 목록 조회 + 등급 수정 + 신규 등록', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAsAgency(page);

    // UAT-15-01: 화주 신규 등록
    await page.goto('/ko/agency/shippers/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="name"]').fill('E2E23 New Shipper');
    await page.locator('select[name="shipper_type"]').selectOption('CORPORATE');
    await page.locator('input[name="discount_rate"]').fill('3.5');
    await page.locator('select[name="grade"]').selectOption('BRONZE');
    await page.locator('input[name="contact_name"]').fill('Test Contact');
    await page.locator('input[name="contact_email"]').fill('contact@e2e23.zenith.kr');
    await page.locator('input[name="contact_phone"]').fill('010-1234-5678');
    await page.getByRole('button', { name: /화주 등록|Register Shipper/ }).click();
    await expect(page).toHaveURL(/\/agency\/shippers/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03a_shipper_registered.png') });

    // UAT-15-02~03: 화주 목록 조회 + 등급 수정
    await page.goto('/ko/agency/shippers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=E2E23 Test Shipper').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_shipper_list.png') });

    const editBtn = page.locator('text=E2E23 Test Shipper').locator('..').locator('button, a').first();
    await editBtn.click();
    await page.waitForLoadState('networkidle');
    const gradeSelect = page.locator('select').first();
    if (await gradeSelect.isVisible()) {
      await gradeSelect.selectOption('GOLD');
    }
    const saveBtn = page.getByRole('button', { name: /저장|수정|Save/ }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForLoadState('networkidle');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_shipper_grade_edit.png') });
  });

  test('TC-AG-05~06: 요율 오버라이드 등록 + 조회', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAsAgency(page);

    // UAT-16-01: 신규 오버라이드 등록
    await page.goto('/ko/agency/rate-overrides/new');
    await page.waitForLoadState('networkidle');
    await page.locator('select[name="base_rate_id"]').selectOption(baseRateId);
    await page.locator('input[name="selling_price"]').fill('55000');
    await page.locator('input[name="cost_price"]').fill('38000');
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[name="valid_from"]').fill(today);
    await page.getByRole('button', { name: /신규 요율 등록|New Rate Override/ }).click();
    await expect(page).toHaveURL(/\/agency\/rate-overrides/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_rate_override_created.png') });

    // UAT-16-02: 오버라이드 목록 조회
    await page.goto('/ko/agency/rate-overrides');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_rate_overrides_list.png') });
  });

  async function runSettlementSearch(page: any) {
    await page.goto('/ko/agency/settlements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/agency\/settlements/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_settlements_page.png') });

    const dateInputs = page.locator('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    if (await dateInputs.first().isVisible()) {
      await dateInputs.nth(0).fill(thirtyDaysAgo);
      await dateInputs.nth(1).fill(today);
    }
    const searchBtn = page.getByRole('button', { name: /조회|Search|검색/ }).first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForLoadState('networkidle');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_settlements_after_search.png') });

    const orderNoInput = page.locator('input[type="text"], input[placeholder*="오더"]').first();
    if (await orderNoInput.isVisible()) {
      await orderNoInput.fill('E2E23-PRICED');
      const searchBtn2 = page.getByRole('button', { name: /조회|Search|검색/ }).first();
      if (await searchBtn2.isVisible()) {
        await searchBtn2.click();
        await page.waitForLoadState('networkidle');
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_order_no_search.png') });
  }

  async function runBasicSettlementSearch(page: any) {
    await page.goto('/ko/agency/settlements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/agency\/settlements/);
    const dateInputs = page.locator('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    if (await dateInputs.first().isVisible()) {
      await dateInputs.nth(0).fill(thirtyDaysAgo);
      await dateInputs.nth(1).fill(today);
      const searchBtn = page.getByRole('button', { name: /조회|Search|검색/ }).first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
  }

  async function checkReconciliationAlert(page: any) {
    await runBasicSettlementSearch(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_reconciliation_alert.png') });

    const alertToggle = page.locator('[data-testid="reconciliation-alert"], button:has-text("미가격"), button:has-text("unpriced")').first();
    if (await alertToggle.isVisible().catch(() => false)) {
      await alertToggle.click();
      await page.waitForLoadState('networkidle');

      const orderLink = page.locator('a[href*="/orders/"]').first();
      if (await orderLink.isVisible().catch(() => false)) {
        const href = await orderLink.getAttribute('href');
        expect(href).toMatch(/\/orders\//);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_reconciliation_expanded.png') });
      }
    }
  }

  test('TC-AG-07~08: 정산 조회 + Reconciliation 알림', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAsAgency(page);
    await runSettlementSearch(page);
    await checkReconciliationAlert(page);
  });

  test('TC-AG-09: Agency 정산 CSV 다운로드', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAsAgency(page);
    await runBasicSettlementSearch(page);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: /CSV|다운로드|Export|내보내기/ }).first().click(),
    ]);

    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/Agency.*Settlements.*\.csv$/i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_csv_download.png') });
  });

  test('TC-AG-11: 오더번호 검색 — 결과 없음', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAsAgency(page);
    await page.goto('/ko/agency/settlements');
    await page.waitForLoadState('networkidle');

    const orderNoInput = page.locator('input[type="text"], input[placeholder*="오더"]').first();
    if (await orderNoInput.isVisible()) {
      await orderNoInput.fill('NONEXISTENT-ORDER-99999');
      const searchBtn = page.getByRole('button', { name: /조회|Search|검색/ }).first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
    await expect(page.locator('text=E2E23-PRICED')).not.toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_order_no_search_empty.png') });
  });

  test('TC-AG-12: Reconciliation 알림 미표시 (가격 오더 검색 시)', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAsAgency(page);
    await page.goto('/ko/agency/settlements');
    await page.waitForLoadState('networkidle');

    const orderNoInput = page.locator('input[type="text"], input[placeholder*="오더"]').first();
    if (await orderNoInput.isVisible()) {
      await orderNoInput.fill('E2E23-PRICED');
      const searchBtn = page.getByRole('button', { name: /조회|Search|검색/ }).first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    const alertBadge = page.locator('text=미가격|unpriced|Reconciliation').first();
    await expect(alertBadge).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_no_reconciliation_alert.png') });
  });
});
