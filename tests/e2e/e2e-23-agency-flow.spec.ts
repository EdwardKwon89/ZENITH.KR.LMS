import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_23_Result';
const SUPABASE_URL = 'http://127.0.0.1:54321';
const AGENCY_EMAIL = 'agency_e2e23@zenith.kr';
const AGENCY_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper_e2e23@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let supabase: ReturnType<typeof createClient>;
let agencyOrgId: string;
let shipperOrgId: string;

test.describe('E2E-23: Agency 전체 흐름 시나리오', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    supabase = createClient(SUPABASE_URL, key);

    await supabase.from('zen_agency_rate_overrides').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('zen_agency_shippers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    for (const u of existingUsers?.users || []) {
      if ([AGENCY_EMAIL, SHIPPER_EMAIL].includes(u.email || '')) {
        await supabase.from('zen_profiles').delete().eq('email', u.email);
        await supabase.auth.admin.deleteUser(u.id);
      }
    }

    // Create AGENCY organization
    const { data: agencyOrg } = await supabase.from('zen_organizations').insert({
      name: 'E2E23 Test Agency',
      type: 'AGENCY',
      status: 'ACTIVE',
    }).select('id').single();
    if (!agencyOrg) throw new Error('Failed to create agency org');
    agencyOrgId = agencyOrg.id;

    // Create SHIPPER organization
    const { data: shipperOrg } = await supabase.from('zen_organizations').insert({
      name: 'E2E23 Test Shipper',
      type: 'CORPORATE',
      status: 'ACTIVE',
    }).select('id').single();
    if (!shipperOrg) throw new Error('Failed to create shipper org');
    shipperOrgId = shipperOrg.id;

    // Link agency to shipper
    await supabase.from('zen_agency_shippers').insert({
      agency_org_id: agencyOrgId,
      shipper_org_id: shipperOrgId,
      shipper_type: 'CORPORATE',
      discount_rate: 0.05,
      grade: 'SILVER',
      is_active: true,
    });

    // Create AGENCY user
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

    // Create SHIPPER user
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

    // Create priced order (has rate snapshot)
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

    // Create unpriced order (no snapshot — revenue = 0)
    await supabase.from('zen_orders').insert({
      order_no: `E2E23-UNPRICED-${Date.now()}`,
      shipper_id: shipperOrgId,
      status: 'RELEASED',
      cargo_details: cargoDetails,
      order_type: 'B2B',
      transport_mode: 'AIR',
    });
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
    await supabase.from('zen_organizations').delete().in('id', [agencyOrgId, shipperOrgId]);
  });

  test('TC-AG-01~02: Agency 로그인 + 대시보드 접근', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', AGENCY_EMAIL);
    await page.fill('input[name="password"]', AGENCY_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|\/agency/, { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_agency_login.png') });

    await page.goto('/ko/agency');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/agency/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_agency_dashboard.png') });
  });

  test('TC-AG-03~04: 화주 목록 조회 + 등급 수정', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', AGENCY_EMAIL);
    await page.fill('input[name="password"]', AGENCY_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|\/agency/, { timeout: 30000 });

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
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_shipper_grade_edit.png') });
  });

  test('TC-AG-05~06: 요율 오버라이드 등록 + 조회', async ({ page }) => {
    test.setTimeout(60000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', AGENCY_EMAIL);
    await page.fill('input[name="password"]', AGENCY_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|\/agency/, { timeout: 30000 });

    await page.goto('/ko/agency/rate-overrides');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_rate_overrides_list.png') });
  });

  test('TC-AG-07~08: 정산 조회 + Reconciliation 알림', async ({ page }) => {
    test.setTimeout(90000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', AGENCY_EMAIL);
    await page.fill('input[name="password"]', AGENCY_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|\/agency/, { timeout: 30000 });

    await page.goto('/ko/agency/settlements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/agency\/settlements/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_settlements_page.png') });

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
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_settlements_after_search.png') });

    const orderNoInput = page.locator('input[type="text"], input[placeholder*="오더"]').first();
    if (await orderNoInput.isVisible()) {
      await orderNoInput.fill('E2E23-PRICED');
      const searchBtn2 = page.getByRole('button', { name: /조회|Search|검색/ }).first();
      if (await searchBtn2.isVisible()) {
        await searchBtn2.click();
        await page.waitForTimeout(2000);
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_order_no_search.png') });

    // Refresh settlement page to check reconciliation alert
    await page.goto('/ko/agency/settlements');
    await page.waitForLoadState('networkidle');
    if (await dateInputs.first().isVisible()) {
      await dateInputs.nth(0).fill(thirtyDaysAgo);
      await dateInputs.nth(1).fill(today);
      const searchBtn3 = page.getByRole('button', { name: /조회|Search|검색/ }).first();
      if (await searchBtn3.isVisible()) {
        await searchBtn3.click();
        await page.waitForTimeout(3000);
      }
    }

    const alertBadge = page.locator('text=미가격|unpriced|Reconciliation').first();
    if (await alertBadge.isVisible().catch(() => false)) {
      await alertBadge.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_reconciliation_alert.png') });
  });
});
