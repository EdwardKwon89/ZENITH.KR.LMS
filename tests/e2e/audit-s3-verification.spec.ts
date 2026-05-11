import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('AUDIT-S3: Corporate Member Management & Withdrawal Verification', () => {
  const TEST_EMAIL = 'shipper@zenith.kr';
  const TEST_PASSWORD = 'password123!'; // Checked against truncated logs
  const RESULT_PATH = 'docs/99_Manual/AUDIT_S3_Result';

  test.beforeEach(async ({ page }) => {
    // Ensure the user is active and approved before test (via DB script or assumed state)
    // Here we assume the user exists as per previous steps
    await page.goto('/ko/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/orders/);
  });

  test('should verify corporate management page and capture screenshot', async ({ page }) => {
    console.log('--- Navigating to Corporate Management ---');
    await page.goto('/ko/mypage/corporate');
    await expect(page.locator('h1')).toContainText('법인 관리');
    await expect(page.locator('h3')).toContainText('법인 기본 정보');
    
    // Switch to Department tab
    await page.click('button:has-text("부서 관리")');
    await expect(page.locator('h3')).toContainText('부서 관리');
    
    // Switch back for consistent screenshot
    await page.click('button:has-text("법인 정보")');
    await expect(page.locator('h3')).toContainText('법인 기본 정보');
    
    // Wait for data to load
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(RESULT_PATH, 'corporate_mgmt.png'), fullPage: true });
    console.log('Saved corporate_mgmt.png');
  });

  test('should verify profile page and withdrawal modal', async ({ page }) => {
    console.log('--- Navigating to Profile Page ---');
    await page.goto('/ko/mypage/profile');
    
    // Capture profile page with withdrawal button
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(RESULT_PATH, 'profile_withdrawal.png'), fullPage: true });
    console.log('Saved profile_withdrawal.png');

    console.log('--- Opening Withdrawal Modal ---');
    await page.click('button:has-text("탈퇴하기")');
    
    const modal = page.locator('.fixed.inset-0'); // Modal overlay
    await expect(modal).toBeVisible();
    
    // Type '탈퇴' to show active state
    await page.fill('input[placeholder="탈퇴"]', '탈퇴');
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(RESULT_PATH, 'withdrawal_modal.png') });
    console.log('Saved withdrawal_modal.png');
  });
});
