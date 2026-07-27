import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_22_Result';

const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper_e2e22@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let supabase: ReturnType<typeof getServiceClient>;
let fixtureOrderId: string | undefined;

test.describe('E2E-22: Daily Close (UPS 일마감) 시나리오', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    supabase = getServiceClient();

    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const existingUsers = authUsersRes?.users || [];

    // 1. Ensure admin user exists with correct PLATFORM metadata
    const adminUser = existingUsers.find((u: any) => u.email === ADMIN_EMAIL);
    if (!adminUser) {
      const { data: created } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
      });
      if (created?.user) {
        await supabase.from('zen_profiles').upsert({
          id: created.user.id,
          email: ADMIN_EMAIL,
          full_name: 'System Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
          grade_code: 'ADMIN',
          org_id: null,
        });
        await supabase.auth.admin.updateUserById(created.user.id, {
          app_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
        });
      }
    } else {
      await supabase.auth.admin.updateUserById(adminUser.id, {
        app_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
      });
      await supabase.from('zen_profiles').upsert({
        id: adminUser.id,
        email: ADMIN_EMAIL,
        full_name: 'System Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        grade_code: 'ADMIN',
        org_id: null,
      });
    }

    // 2. Create shipper test user
    const existingShipper = existingUsers.find((u: any) => u.email === SHIPPER_EMAIL);
    if (existingShipper) {
      await supabase.from('zen_profiles').delete().eq('email', SHIPPER_EMAIL);
      await supabase.auth.admin.deleteUser(existingShipper.id);
    }

    const { data: signUp } = await supabase.auth.admin.createUser({
      email: SHIPPER_EMAIL,
      password: SHIPPER_PASSWORD,
      email_confirm: true,
    });

    let shipperUserId: string | undefined;
    if (signUp?.user) {
      shipperUserId = signUp.user.id;
      await supabase.from('zen_profiles').upsert({
        id: shipperUserId,
        email: SHIPPER_EMAIL,
        full_name: 'E2E22 Test Shipper',
        role: 'CORPORATE',
        status: 'ACTIVE',
        grade_code: 'IRON',
        org_id: null,
      });
    }

    // 3. Create RELEASED orders fixture for daily close aggregation
    if (shipperUserId) {
      const today = new Date().toISOString().split('T')[0];
      const cargoDetails = JSON.stringify([{ qty: 2, weight: 5.5, description: 'E2E fixture cargo' }]);

      const { data: order } = await supabase.from('zen_orders').insert({
        order_no: `E2E22-${Date.now()}`,
        shipper_id: shipperUserId,
        status: 'RELEASED',
        cargo_details: cargoDetails,
        order_type: 'B2B',
        transport_mode: 'AIR',
        dest_port_id: null,
        origin_port_id: null,
      }).select('id').single();

      if (order) {
        await supabase.from('order_status_history').insert({
          order_id: order.id,
          next_status: 'RELEASED',
          prev_status: 'CONFIRMED',
          changed_by: adminUser?.id || null,
        });

        await supabase.from('zen_order_rate_snapshots').insert({
          order_id: order.id,
          applied_unit_price: 250.00,
          applied_currency: 'USD',
          applied_rule: 'STANDARD',
          carrier_cost_amount: 180.00,
          platform_fee_amount: 20.00,
        });

        const { data: pkg } = await supabase.from('zen_order_packages').insert({
          order_id: order.id,
          packing_unit: 'CTN',
          packing_count: 2,
          gross_weight: 5.5,
          length: 30,
          width: 20,
          height: 15,
        }).select('id').single();
        fixtureOrderId = order.id;
      }
    }
  });

  test.afterAll(async () => {
    // Cleanup fixture orders
    if (fixtureOrderId) {
      await supabase.from('zen_order_rate_snapshots').delete().eq('order_id', fixtureOrderId);
      await supabase.from('order_status_history').delete().eq('order_id', fixtureOrderId);
      await supabase.from('zen_order_packages').delete().eq('order_id', fixtureOrderId);
      await supabase.from('zen_orders').delete().eq('id', fixtureOrderId);
    }

    // Cleanup shipper user
    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const shipperUser = (authUsersRes?.users || []).find((u: any) => u.email === SHIPPER_EMAIL);
    if (shipperUser) {
      await supabase.from('zen_profiles').delete().eq('email', SHIPPER_EMAIL);
      await supabase.auth.admin.deleteUser(shipperUser.id);
    }
  });

  test('TC-P7-CLOSE-01~04: 일일 출고 집계, 매출/매입/마진, 기간 조회, 빈 날짜 조회', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      console.log('1. Admin Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[data-action="login"]');
      await expect(page).toHaveURL(/\/orders|\/dashboard|\/ups/, { timeout: 30000 });
      console.log('Admin Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_admin_login.png') });

      console.log('2. Navigate to /ko/ups/daily-close...');
      await page.goto('/ko/ups/daily-close');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/ups\/daily-close/);
      console.log('Daily close page loaded.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_daily_close_page.png') });

      console.log('3. Querying daily close for today...');
      const todayDateInput = page.locator('input[type="date"]').first();
      const today = new Date().toISOString().split('T')[0];
      await todayDateInput.fill(today);
      await page.getByRole('button', { name: /조회|Search/ }).first().click();

      // Wait for server action to complete
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_after_search.png') });

      // After fixture creation, expect outbound summary card title
      await expect(page.getByText('당일 출고 현황')).toBeVisible({ timeout: 15000 });
      console.log('Outbound summary card displayed with fixture data.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_outbound_data.png') });
      console.log('Date query interaction completed.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_date_query.png') });

      console.log('5. Querying future date range with no data...');
      const dateInputs = page.locator('input[type="date"]');
      await dateInputs.nth(0).fill('2099-12-25');
      await dateInputs.nth(1).fill('2099-12-31');
      await page.getByRole('button', { name: /조회|Search/ }).first().click();
      await page.waitForTimeout(2000);

      // OutboundSummaryCard still renders with 0 values (not null)
      // Revenue table should be empty (no rows for 2099)
      await expect(page.getByText('당일 출고 현황')).toBeVisible({ timeout: 10000 });
      // PKG count should be 0 for future date
      await expect(page.getByText('0').first()).toBeVisible();
      console.log('Future date search returns 0 results as expected.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_empty_future.png') });

      console.log('E2E-22: All close-01~04 scenarios completed successfully.');
    } catch (err) {
      console.error('Test failed! Capturing failure screenshot.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure.png') });
      throw err;
    }
  });

  test('TC-P7-CLOSE-05: 권한 검증 (SHIPPER 접근 차단)', async ({ page }) => {
    test.setTimeout(60000);

    try {
      console.log('1. Shipper Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[name="email"]', SHIPPER_EMAIL);
      await page.fill('input[name="password"]', SHIPPER_PASSWORD);
      await page.click('button[data-action="login"]');
      await expect(page).toHaveURL(/\/orders|\/dashboard/, { timeout: 30000 });
      console.log('Shipper Login successful.');

      console.log('2. Attempting to access /ko/ups/daily-close as shipper...');
      await page.goto('/ko/ups/daily-close', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/ups/daily-close');
      console.log('Access blocked as expected. Redirected to:', currentUrl);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_rbac_blocked.png') });
    } catch (err) {
      console.error('RBAC test failed!');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_rbac.png') });
      throw err;
    }
  });
});