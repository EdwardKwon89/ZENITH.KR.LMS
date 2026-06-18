import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_22_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

test.describe('E2E-22: 일마감 처리 시나리오', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // TASK-152 구현 완료 전까지 skip 처리
  test.skip('일일 출고 내역 및 매출/매입/마진 집계 조회, 기간별 마감 이력 조회, 비권한 사용자 접근 차단 검증', async ({ page }) => {
    test.setTimeout(120000);

    // Console logs redirect
    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      // 1. Admin Login
      console.log('1. Admin Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('Admin Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_admin_login_success.png') });

      // 2. Go to Daily Close Page
      console.log('2. Navigating to daily close page...');
      await page.goto('/ko/ups/daily-close');
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_daily_close_page.png') });

      // 3. Query specific date
      console.log('3. Querying daily close for a specific date...');
      await page.fill('input[type="date"]', '2026-06-17');
      await page.click('button:has-text("조회")');

      // Verify outbound summary card and revenue table are visible
      const outboundSummaryCard = page.locator('text=총 패키지 수, text=총 중량');
      await expect(outboundSummaryCard).toBeVisible({ timeout: 15000 });
      
      const revenueTable = page.locator('table:has-text("매출"), table:has-text("매입"), table:has-text("마진")');
      await expect(revenueTable).toBeVisible();
      console.log('Daily outbound summary and revenue data loaded successfully.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_daily_data_loaded.png') });

      // 4. Query range history
      console.log('4. Querying history for a date range...');
      // If there is a tab or separate form for range, interact with it. Otherwise fill from/to inputs.
      await page.fill('input[name="from"]', '2026-06-15');
      await page.fill('input[name="to"]', '2026-06-17');
      await page.click('button:has-text("검색"), button:has-text("조회")');

      const historyTable = page.locator('table');
      await expect(historyTable).toBeVisible({ timeout: 15000 });
      // Check if rows are grouped by date
      const dateRow = historyTable.locator('td:has-text("2026-06-17")');
      await expect(dateRow).toBeVisible();
      console.log('Daily close history queried successfully.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_history_data_loaded.png') });

      // 5. Logout and test RBAC authorization
      console.log('5. Testing RBAC for non-admin user...');
      await page.goto('/ko/login');
      // Sign out by visiting login or click signout if visible
      // Now login as shipper
      await page.fill('input[name="email"]', SHIPPER_EMAIL);
      await page.fill('input[name="password"]', SHIPPER_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('Shipper Login successful.');

      // Directly try to access /ko/ups/daily-close
      await page.goto('/ko/ups/daily-close');
      await page.waitForLoadState('domcontentloaded');
      
      // Page should be blocked, redirect to dashboard or show 403 / Access Denied
      const url = page.url();
      expect(url).not.toContain('/ups/daily-close');
      console.log('Access blocked as expected. Redirected to:', url);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_rbac_blocked.png') });

    } catch (err) {
      console.error('Test failed! Capturing failure_diagnostic.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_diagnostic.png') });
      throw err;
    }
  });
});
