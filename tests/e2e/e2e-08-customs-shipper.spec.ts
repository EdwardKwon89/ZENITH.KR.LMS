import { test, expect } from '@playwright/test';

// Test Data (Sync with Aiden's directive in TASK_BOARD.md)
const SHIPPER_EMAIL = 'test_corp_1777785263838@zenith.kr';
const PASSWORD = 'password1234';
const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';
const EXPECTED_ADMIN_NOTE = 'E2E Test: Customs approved automatically.';

test.describe('E2E-08: Shipper Customs History and Admin Note Verification', () => {
  test('Shipper should view approved customs data and admin notes', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minutes

    // --- Step 1: Shipper Login ---
    console.log(`Step 1: Logging in as Shipper: ${SHIPPER_EMAIL}`);
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input#email', SHIPPER_EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[data-action="login"]');
    
    await page.waitForURL(/.*(dashboard|orders)/);
    console.log('Shipper login successful');

    // --- Step 2: Verify Order Details Customs Section ---
    console.log(`Step 2: Navigating to Order Details: ${TEST_ORDER_ID}`);
    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('networkidle');

    // Locate OrderCustomsSection
    const customsSection = page.locator('section').filter({ has: page.getByText('통관 현황', { exact: false }) });
    await expect(customsSection).toBeVisible();

    // Verify "APPROVED" status (통관 승인 in Korean)
    await expect(customsSection.getByText('통관 승인')).toBeVisible();

    // Verify Admin Note visibility (The component adds quotes around the note)
    await expect(customsSection.getByText(EXPECTED_ADMIN_NOTE)).toBeVisible();
    
    // Take screenshot for Step 2
    await page.screenshot({ 
      path: 'docs/99_Manual/E2E_08_Result/e2e_08_01_order_customs_section.png', 
      fullPage: true 
    });
    console.log('OrderCustomsSection verification successful');

    // --- Step 3: Verify MyPage Customs History ---
    console.log('Step 3: Navigating to MyPage Customs History...');
    await page.goto('/ko/mypage/customs');
    await page.waitForLoadState('networkidle');

    // Find our order in the history table
    // The table should show Z-FIN-E2E05-01 (Order No) and APPROVED status
    const historyRow = page.locator('tr').filter({ hasText: 'Z-FIN-E2E05-01' }).filter({ hasText: '통관 승인' }).first();
    await expect(historyRow).toBeVisible();

    // Take screenshot for Step 3
    await page.screenshot({ 
      path: 'docs/99_Manual/E2E_08_Result/e2e_08_02_mypage_history.png', 
      fullPage: true 
    });
    console.log('MyPage Customs History verification successful');
    
    console.log('E2E-08 Shipper Customs History Verification Passed!');
  });
});
