import { test, expect } from '@playwright/test';

// Test Data
const TEST_EMAIL = 'admin@zenith.kr';
const PASSWORD = 'password1234';
const TEST_ORDER_ID = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';
const TEST_ORDER_NO = 'TRK-QA-TEST-001';

test.describe('E2E-10: Claim Registration & Multilingual Documents', () => {
  test('Complete Claim Lifecycle and PDF Verification', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    // --- Step 1: Claim Registration ---
    console.log(`Step 1: Logging in as User: ${TEST_EMAIL}`);
    await page.goto('/ko/login');
    await page.waitForSelector('input#email');
    
    await page.fill('input#email', TEST_EMAIL);
    await page.fill('input#password', PASSWORD);
    console.log('Clicking login button...');
    await page.click('button[data-action="login"]');
    
    try {
      await page.waitForURL(/.*(orders|dashboard)/, { timeout: 20000 });
      console.log('Login successful');
    } catch (e) {
      console.log('Login timeout. Current URL:', page.url());
      await page.screenshot({ path: 'scratch/e2e-10-login-timeout.png' });
      // If already on orders, continue
      if (!page.url().includes('orders')) throw e;
    }

    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('load');
    console.log('Order detail page loaded');
    await page.screenshot({ path: 'scratch/e2e-10-order-detail-initial.png', fullPage: true });

    // Click Claim Button
    console.log('Looking for Claim button...');
    const claimBtn = page.locator('button').filter({ hasText: /클레임 접수/ });
    try {
      await expect(claimBtn).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('Claim button not visible. Current URL:', page.url());
      await page.screenshot({ path: 'scratch/e2e-10-claim-btn-missing.png', fullPage: true });
      throw e;
    }
    await claimBtn.click();
    console.log('Claim Modal opened');

    // Fill Claim Form
    console.log('Filling Claim form...');
    await page.locator('button').filter({ hasText: /^파손$/ }).click();
    
    const timestamp = new Date().getTime();
    const description = `E2E Test Claim - Product damaged during transit - ${timestamp}`;
    await page.getByPlaceholder(/클레임에 대한 구체적인 내용을 입력해 주세요/).fill(description);
    
    // Submit
    console.log('Submitting Claim...');
    const submitBtn = page.getByRole('button', { name: /접수하기/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    
    // Verify success toast or check for error toast
    console.log('Waiting for success toast...');
    try {
      await expect(
        page.getByText(/클레임이 성공적으로 접수되었습니다/i)
      ).toBeVisible({ timeout: 15000 });
      console.log('Claim registration successful.');
    } catch (e) {
      console.log('Success toast not found. Checking for error toast...');
      const errorToast = page.locator('.sonner-toast-error'); // Assuming Sonner is used as seen in component
      if (await errorToast.isVisible()) {
        const errorMsg = await errorToast.textContent();
        console.log('Error toast found:', errorMsg);
      }
      await page.screenshot({ path: 'scratch/e2e-10-submit-failure.png', fullPage: true });
      throw e;
    }
    
    await page.screenshot({ path: 'docs/99_Manual/E2E_10_Result/e2e_10_01_claim_registered.png', fullPage: true });

    // --- Step 2: PDF Document Verification (Korean) ---
    console.log('Step 2: Verifying PDF Document Labels (KO)');
    const ciLabel = page.getByText('Commercial Invoice (CI)');
    const plLabel = page.getByText('Packing List (PL)');
    await expect(ciLabel).toBeVisible();
    await expect(plLabel).toBeVisible();
    
    // Verify the descriptive text in Korean
    await expect(page.getByText(/오더별 상업송장\(CI\) 및 패킹리스트\(PL\)를/)).toBeVisible();
    
    await page.screenshot({ path: 'docs/99_Manual/E2E_10_Result/e2e_10_02_docs_ko.png', fullPage: true });

    // --- Step 3: PDF Document Verification (English) ---
    console.log('Step 3: Verifying PDF Document Labels (EN)');
    await page.goto(`/en/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('load');
    
    // Verify descriptive text changed to English
    await expect(page.getByText(/View and generate Commercial Invoices/)).toBeVisible();
    
    const ciLabelEn = page.getByText('Commercial Invoice (CI)');
    await expect(ciLabelEn).toBeVisible();
    
    await page.screenshot({ path: 'docs/99_Manual/E2E_10_Result/e2e_10_03_docs_en.png', fullPage: true });

    console.log('E2E-10 Claim & Documents Test Passed!');
  });
});
