import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_01_Result/RERUN_2026-05-22';

test.describe('E2E-01: Corporate Registration & Admin Approval', () => {
  const TIMESTAMP = Date.now();
  const testEmail = `test_corp_${TIMESTAMP}@zenith.kr`;
  const testPassword = 'Password1234';
  const testOrgName = `Test Corp ${TIMESTAMP}`;

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('should register a new corporate user and be approved by admin', async ({ page }) => {
    test.setTimeout(120000);
    // Console logs redirect
    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    // 1. Registration Phase
    console.log('--- Step 1: Registration ---');
    await page.goto('/ko/register');
    
    // Step 1: TYPE
    await page.click('button:has-text("법인회원")');
    await page.click('button:has-text("다음 단계로")');
    
    // Step 2: ORG_JOIN -> Select Create New
    await page.click('button:has-text("신규 법인 등록")');
    
    // Step 3: ORG_CREATE
    await page.fill('input[placeholder="법인 명칭 (상호명)"]', testOrgName);
    await page.fill('input[placeholder="사업자등록번호 (숫자만)"]', '1234567890');
    // Role selection is often radio or button
    await page.click('button:has-text("송하인(화주)")');
    await page.click('button:has-text("다음 단계로")');
    
    // Step 4: INFO
    await page.fill('input[placeholder="이름 (성함)"]', 'Test Admin');
    await page.fill('input[placeholder="이메일 주소"]', testEmail);
    await page.fill('input[placeholder="비밀번호"]', testPassword);
    await page.click('button:has-text("다음 단계로")');
    
    // Step 5: DOCS
    // Upload dummy document
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("파일 선택")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(process.cwd(), 'scratch/dummy_biz_reg.txt'));
    
    await page.click('button:has-text("가입 신청 완료")');
    
    // Verify redirect to pending
    await expect(page).toHaveURL(/\/register\/pending/);
    await expect(page.locator('.max-w-xl h1')).toContainText('심사');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_registration_pending.png') });

    // 2. Admin Approval Phase
    console.log('--- Step 2: Admin Approval ---');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    
    await page.fill('input[name="email"]', 'admin@zenith.kr');
    await page.fill('input[name="password"]', 'password1234');
    await page.click('button[type="submit"]');
    
    // Check for success redirect
    await expect(page).toHaveURL(/\/orders|admin|dashboard/);
    
    // Go to Admin Organizations page - corrected path
    await page.goto('/ko/admin/organizations'); 
    
    // Handle the confirm dialog for approval
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept();
    });
    
    // Find the pending org card and approve
    // ZenCard renders as a div with the org name in an h3
    const orgCard = page.locator('div').filter({ has: page.locator(`h3:has-text("${testOrgName}")`) }).first();
    await expect(orgCard).toBeVisible({ timeout: 30000 });
    console.log('Org card found for:', testOrgName);
    
    const approveBtn = page.locator('button').filter({ hasText: '법인 최종 승인' }).first();
    await expect(approveBtn).toBeVisible({ timeout: 10000 });
    await approveBtn.click();
    
    // Wait for the UI to update after approval (dialog auto-accepted)
    await expect(page.locator(`h3:has-text("${testOrgName}")`)).not.toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_admin_approved.png') });

    // 3. Verification Phase
    console.log('--- Step 3: Verification ---');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Should be redirected to dashboard (/orders) now instead of /register/pending
    await expect(page).toHaveURL(/\/orders/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_login_success.png') });
    
    // 4. Access Control Verification
    console.log('--- Step 4: Access Control Verification ---');
    // Try to access admin page as a shipper
    await page.goto('/ko/admin/organizations');
    
    // Should be redirected away or shown 403
    const finalUrl = page.url();
    expect(finalUrl).not.toContain('/admin/organizations');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_access_control.png') });
    
    console.log('--- E2E-01 Success! ---');
  });
});

