import { test, expect } from '@playwright/test';
import fs from 'fs';

// Test Data
const ADMIN_EMAIL = 'admin_e2e@zenith.kr';
const ADMIN_PASSWORD = 'password1234!';
const TEST_ORDER_ID = '3ff5b116-29cd-4d90-8dd0-0e99c36a2155';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_10_Result';

test.describe('E2E-10: Claim Registration & Multilingual Documents', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Complete Claim Lifecycle and PDF Verification', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    page.on('console', msg => {
      console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`);
    });

    const TIMESTAMP = Date.now();
    const USER_EMAIL = `test_shipper_${TIMESTAMP}@zenith.kr`;
    const USER_PASSWORD = 'password1234!';
    const USER_NAME = `Shipper ${TIMESTAMP}`;

    // --- Setup: Individual Shipper Registration ---
    console.log(`Setup: Registering as new Individual Shipper: ${USER_EMAIL}`);
    await page.goto('/ko/register');
    await page.waitForLoadState('networkidle');

    // Select Individual
    await page.click('button:has-text("개인회원")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("다음 단계로")');
    await page.waitForTimeout(500);

    // Enter Info
    await page.fill('input[placeholder="이름 (성함)"]', USER_NAME);
    await page.fill('input[placeholder="이메일 주소"]', USER_EMAIL);
    await page.fill('input[placeholder="비밀번호"]', USER_PASSWORD);
    await page.click('button:has-text("다음 단계로")');

    // Wait for Dashboard redirect (implies successful registration and DB triggers)
    await expect(page).toHaveURL(/\/orders/, { timeout: 15000 });
    console.log('✅ Registration Success');
    
    // --- Ownership Fix: Assign order to new user ---
    console.log(`Assigning Order ${TEST_ORDER_ID} to new user ${USER_EMAIL}`);
    const { execSync } = require('child_process');
    
    // Wait up to 15 seconds for profile to sync from auth.users via trigger
    let profileExists = false;
    for (let i = 0; i < 15; i++) {
      try {
        const result = execSync(`supabase db query "SELECT email FROM public.zen_profiles WHERE email = '${USER_EMAIL}'"`).toString();
        // Check if the result contains the email
        if (result.includes(USER_EMAIL)) {
          profileExists = true;
          console.log(`✅ Profile found for ${USER_EMAIL} (attempt ${i+1})`);
          break;
        }
      } catch (e) {
        console.log(`... waiting for profile sync (attempt ${i+1})`);
      }
      await page.waitForTimeout(1000);
    }

    if (profileExists) {
      try {
        // Ensure both created_by and shipper_id (if relevant) are updated for visibility
        const updateSql = `UPDATE public.zen_orders SET created_by = (SELECT id FROM public.zen_profiles WHERE email = '${USER_EMAIL}') WHERE id = '${TEST_ORDER_ID}'`;
        execSync(`supabase db query "${updateSql}"`);
        console.log(`✅ Ownership assigned for order ${TEST_ORDER_ID}`);
      } catch (err) {
        console.error('❌ Failed to assign ownership:', err);
      }
    } else {
      throw new Error(`❌ Critical: Profile sync timed out for ${USER_EMAIL}. E2E cannot proceed.`);
    }

    
    // --- Step 1: Claim Registration (Shipper) ---
    console.log('Step 1: Registering Claim as Shipper');
    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('load');
    console.log('Order detail page loaded');

    // Click Claim Button
    console.log('Looking for Claim button...');
    const claimBtn = page.locator('button').filter({ hasText: /클레임 접수/ });
    await expect(claimBtn).toBeVisible({ timeout: 15000 });
    await claimBtn.click();
    console.log('Claim Modal opened');

    // Fill Claim Form
    console.log('Filling Claim form...');
    await page.locator('button').filter({ hasText: /^파손$/ }).click();
    const description = `E2E Test Claim - Product damaged during transit - ${TIMESTAMP}`;
    await page.getByPlaceholder(/클레임에 대한 구체적인 내용을 입력해 주세요/).fill(description);
    
    // Submit
    console.log('Submitting Claim...');
    const submitBtn = page.getByRole('button', { name: /접수하기/ });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    
    // Verify success toast
    console.log('Waiting for success toast...');
    try {
      await expect(
        page.getByText(/클레임이 성공적으로 접수되었습니다/i)
      ).toBeVisible({ timeout: 15000 });
      console.log('Claim registration successful.');
    } catch (e) {
      console.log('Success toast not found. Checking for error toast...');
      await page.screenshot({ path: `test-results/e2e-10-submit-failure-${TIMESTAMP}.png`, fullPage: true });
      
      const errorToast = page.locator('[data-sonner-toast]');
      const count = await errorToast.count();
      console.log(`Found ${count} toasts`);
      for (let i = 0; i < count; i++) {
        console.log(`Toast ${i}:`, await errorToast.nth(i).innerText());
      }
      
      throw e;
    }
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_10_01_claim_registered.png`, fullPage: true });

    // --- Step 2: PDF Document Verification (Korean) (Admin) ---
    console.log('Step 2: Admin verifying PDF Document Labels (KO)');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|dashboard/, { timeout: 15000 });

    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('load');

    const ciLabel = page.getByText('Commercial Invoice (CI)');
    const plLabel = page.getByText('Packing List (PL)');
    await expect(ciLabel).toBeVisible();
    await expect(plLabel).toBeVisible();
    
    // Verify the descriptive text in Korean
    await expect(page.getByText(/오더별 상업송장\(CI\) 및 패킹리스트\(PL\)를/)).toBeVisible();
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_10_02_docs_ko.png`, fullPage: true });

    // --- Step 3: PDF Document Verification (English) (Admin) ---
    console.log('Step 3: Admin verifying PDF Document Labels (EN)');
    await page.goto(`/en/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('load');
    
    // Verify descriptive text changed to English
    await expect(page.getByText(/View and generate Commercial Invoices/)).toBeVisible();
    const ciLabelEn = page.getByText('Commercial Invoice (CI)');
    await expect(ciLabelEn).toBeVisible();
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_10_03_docs_en.png`, fullPage: true });

    // --- Step 4: Shipper Confirmation (Shipper Re-login) ---
    console.log('Step 4: Shipper re-login and document confirmation');
    await page.context().clearCookies();
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input#email', USER_EMAIL);
    await page.fill('input#password', USER_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders/, { timeout: 15000 });

    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('load');

    // Shipper should also see the documents
    const ciLabelShipper = page.getByText('Commercial Invoice (CI)');
    const plLabelShipper = page.getByText('Packing List (PL)');
    await expect(ciLabelShipper).toBeVisible();
    await expect(plLabelShipper).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_10_04_shipper_docs_confirm.png`, fullPage: true });

    console.log('E2E-10 Claim & Documents Test Passed!');
  });
});
