import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('E2E-01: Corporate Registration & Admin Approval', () => {
  const TIMESTAMP = Date.now();
  const testEmail = `test_corp_${TIMESTAMP}@zenith.kr`;
  const testPassword = 'password1234';
  const testOrgName = `Test Corp ${TIMESTAMP}`;

  test('should register a new corporate user and be approved by admin', async ({ page }) => {
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
    await expect(page.locator('h1')).toContainText('심사');
    await page.screenshot({ path: 'test-results/e2e_01_registration_pending.png' });

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
    const orgCard = page.locator('.zen-glass').filter({ hasText: testOrgName }).first();
    await expect(orgCard).toBeVisible({ timeout: 15000 });
    
    const approveBtn = orgCard.locator('button:has-text("법인 최종 승인")');
    await approveBtn.click();
    
    // Wait for the UI to update
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/e2e_01_admin_approved.png' });

    // 3. Verification Phase
    console.log('--- Step 3: Verification ---');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Should be redirected to dashboard (/orders) now instead of /register/pending
    await expect(page).toHaveURL(/\/orders/);
    await page.screenshot({ path: 'test-results/e2e_01_login_success.png' });
    
    // 4. Access Control Verification
    console.log('--- Step 4: Access Control Verification ---');
    // Try to access admin page as a shipper
    await page.goto('/ko/admin/organizations');
    
    // Should be redirected away or shown 403
    const finalUrl = page.url();
    expect(finalUrl).not.toContain('/admin/organizations');
    await page.screenshot({ path: 'test-results/e2e_01_access_control_success.png' });
    
    console.log('--- E2E-01 Success! ---');
  });
});

