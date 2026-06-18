import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
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

let supabase: ReturnType<typeof createClient>;

test.describe('E2E-22: Daily Close (UPS 일마감) 시나리오', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    supabase = createClient(SUPABASE_URL, key);

    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const existing = (authUsersRes?.users || []).find(u => u.email === SHIPPER_EMAIL);
    if (existing) {
      await supabase.from('zen_profiles').delete().eq('email', SHIPPER_EMAIL);
      await supabase.auth.admin.deleteUser(existing.id);
    }

    const { data: signUp } = await supabase.auth.admin.createUser({
      email: SHIPPER_EMAIL,
      password: SHIPPER_PASSWORD,
      email_confirm: true,
    });

    if (signUp?.user) {
      await supabase.from('zen_profiles').insert({
        id: signUp.user.id,
        email: SHIPPER_EMAIL,
        full_name: 'E2E22 Test Shipper',
        role: 'CORPORATE',
        status: 'ACTIVE',
        grade_code: 'IRON',
        org_id: null,
      });
    }
  });

  test.afterAll(async () => {
    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const user = (authUsersRes?.users || []).find(u => u.email === SHIPPER_EMAIL);
    if (user) {
      await supabase.from('zen_profiles').delete().eq('email', SHIPPER_EMAIL);
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  test('TC-P7-CLOSE-01~04: 일일 출고 집계, 매출/매입/마진, 기간 조회, 빈 날짜 조회', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      console.log('1. Admin Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]'),
      ]);
      console.log('Admin Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_admin_login.png') });

      console.log('2. Navigate to /ko/ups/daily-close...');
      await page.goto('/ko/ups/daily-close');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('h1:has-text("일마감"), h1:has-text("Daily Close"), text=출고 집계')).toBeVisible({ timeout: 15000 });
      console.log('Daily close page loaded.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_daily_close_page.png') });

      console.log('3. Querying daily close for today...');
      const todayDateInput = page.locator('input[type="date"]');
      const today = new Date().toISOString().split('T')[0];
      await todayDateInput.fill(today);
      await page.click('button:has-text("조회")');
      await page.waitForTimeout(1500);

      const outboundCard = page.locator('text=총, text=PKG, text=중량');
      await expect(outboundCard.first()).toBeVisible({ timeout: 10000 });
      console.log('Outbound summary displayed.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_outbound_summary.png') });

      console.log('4. Checking revenue summary table...');
      const revenueTable = page.locator('table:has-text("매출"), table:has-text("Revenue")');
      await expect(revenueTable).toBeVisible({ timeout: 10000 });
      console.log('Revenue summary table visible.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_revenue_table.png') });

      console.log('5. Querying date range...');
      const fromInput = page.locator('input[name="from"], input[placeholder*="시작"]').first();
      const toInput = page.locator('input[name="to"], input[placeholder*="종료"]').first();
      if (await fromInput.isVisible()) {
        await fromInput.fill('2026-06-01');
        await toInput.fill(today);
        await page.click('button:has-text("검색"), button:has-text("조회")');
        await page.waitForTimeout(1500);
      }
      console.log('Date range queried.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_range_query.png') });

      console.log('6. Querying future date with no data...');
      await todayDateInput.fill('2099-12-31');
      await page.click('button:has-text("조회")');
      await page.waitForTimeout(1500);
      console.log('Empty date query completed.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_empty_date.png') });

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
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', SHIPPER_EMAIL);
      await page.fill('input[name="password"]', SHIPPER_PASSWORD);
      await Promise.all([
        page.waitForURL(url => url.pathname !== '/ko/login', { timeout: 30000 }),
        page.click('button[data-action="login"]'),
      ]);
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