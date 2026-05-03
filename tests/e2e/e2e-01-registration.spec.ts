import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('E2E-01: Corporate Registration & Admin Approval', () => {
  const testEmail = `test_corp_${Date.now()}@zenith.kr`;
  const testPassword = 'password1234';
  const testOrgName = `Test Corp ${Date.now()}`;

  test('should register a new corporate user and be approved by admin', async ({ page }) => {
    // 1. Registration Phase
    console.log('--- Step 1: Registration ---');
    await page.goto('/ko/register');
    
    // Step 1: TYPE
    await page.click('text=법인회원');
    await page.click('text=다음 단계로');
    
    // Step 2: ORG_JOIN -> Select Create New
    await page.click('text=신규 법인 등록(심사 신청)');
    
    // Step 3: ORG_CREATE
    await page.fill('[placeholder="법인 명칭 (상호명)"]', testOrgName);
    await page.fill('[placeholder="사업자등록번호 (숫자만)"]', '1234567890');
    await page.click('text=송하인(화주)');
    await page.click('text=다음 단계로');
    
    // Step 4: INFO
    await page.fill('[placeholder="이름 (성함)"]', 'Test Admin');
    await page.fill('[placeholder="이메일 주소"]', testEmail);
    await page.fill('[placeholder="비밀번호"]', testPassword);
    await page.click('text=다음 단계로');
    
    // Step 5: DOCS
    // Upload dummy document
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=파일 선택');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(process.cwd(), 'scratch/dummy_biz_reg.txt'));
    
    await page.click('text=가입 신청 완료');
    
    // Verify redirect to pending
    await expect(page).toHaveURL(/\/register\/pending/);
    // Note: Pending page might have localized text, we check for part of it or the icon
    // Since we fixed the locale to /ko, let's look for "심사"
    await expect(page.locator('h1')).toContainText('심사');

    // 2. Admin Approval Phase
    console.log('--- Step 2: Admin Approval ---');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    
    await page.fill('input[type="email"]', 'admin@zenith.kr');
    await page.fill('input[type="password"]', 'password1234');
    await page.click('button:has-text("로그인")');
    
    await expect(page).toHaveURL(/\/orders/);
    
    // Go to Admin Organizations page (using the correct path from earlier search)
    await page.goto('/ko/organizations'); 
    
    // Find the pending org card and approve
    const orgCard = page.locator('.zen-glass', { hasText: testOrgName });
    await expect(orgCard).toBeVisible();
    
    // Handle the confirm dialog for approval
    page.once('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      await dialog.accept();
    });
    
    await orgCard.locator('button', { hasText: '법인 최종 승인' }).click();
    
    // Handle the success alert
    page.once('dialog', async dialog => {
      console.log('Success dialog:', dialog.message());
      await dialog.dismiss();
    });

    // 3. Verification Phase
    console.log('--- Step 3: Verification ---');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("로그인")');
    
    // Should be redirected to dashboard (/orders) now instead of /register/pending
    await expect(page).toHaveURL(/\/orders/);
    console.log('--- E2E-01 Success! ---');
  });
});
