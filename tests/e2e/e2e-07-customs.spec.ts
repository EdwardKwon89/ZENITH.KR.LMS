import { test, expect } from '@playwright/test';

// Test Data
const ADMIN_EMAIL = 'admin@zenith.kr';
const PASSWORD = 'password1234';
const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';
const TEST_ORDER_NO = 'Z-FIN-E2E05-01';

test.describe('E2E-07: Customs Declaration Lifecycle', () => {
  test('Complete Customs Lifecycle', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    // --- Step 1: Admin Login ---
    console.log(`Step 1: Logging in as Admin: ${ADMIN_EMAIL}`);
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[data-action="login"]');
    
    await page.waitForURL(/.*(dashboard|orders|admin)/);
    console.log('Login successful');

    // --- Step 2: Create Declaration ---
    console.log('Step 2: Navigating to Customs Admin page...');
    await page.goto('/ko/admin/customs');
    await page.waitForLoadState('networkidle');

    console.log('Opening Create Declaration Modal...');
    await page.click('button:has-text("신고 생성")');
    
    console.log('Filling declaration form...');
    await page.fill('#order-id-input', TEST_ORDER_ID);
    await page.fill('#cargo-description-input', 'E2E Test Cargo - Electronics');
    await page.fill('#declared-value-input', '150000');
    await page.selectOption('#currency-code-select', 'KRW');
    
    console.log('Submitting declaration creation...');
    await page.click('#submit-declaration-btn');

    // Verify creation success
    await expect(page.getByText(/신고가 성공적으로 생성되었습니다/i)).toBeVisible({ timeout: 15000 });
    console.log('Declaration created successfully');

    // --- Step 3: Submit to Customs Authorities ---
    console.log('Step 3: Submitting declaration to authorities...');
    // Find the row with our order number and PENDING status
    const row = page.locator('tr').filter({ hasText: TEST_ORDER_NO }).filter({ hasText: '신고 대기' }).first();
    await expect(row).toBeVisible();
    
    // Confirm dialog (browser dialog) - must be set BEFORE the action that triggers it
    page.once('dialog', dialog => dialog.accept());
    
    // Click the submit (Send) button in the row
    const submitBtn = row.locator('button').nth(1); // Second button is Send icon
    await submitBtn.click();
    
    await expect(page.getByText(/신고가 성공적으로 제출되었습니다/i)).toBeVisible({ timeout: 15000 });
    console.log('Declaration submitted to authorities');

    // --- Step 4: Approve Declaration ---
    // Find the row with our order number and SUBMITTED status
    const submittedRow = page.locator('tr').filter({ hasText: TEST_ORDER_NO }).filter({ hasText: '신고 완료' }).first();
    await expect(submittedRow).toBeVisible();

    // Click view (Eye) button
    const viewBtn = submittedRow.locator('button').nth(0);
    await viewBtn.click();
    
    // Change status to APPROVED using specific ID
    await page.selectOption('#status-select', 'APPROVED');
    await page.fill('#admin-note-input', 'E2E Test: Customs approved automatically.');
    
    console.log('Saving status change...');
    await page.click('#save-status-btn');
    
    await expect(page.getByText(/상태가 업데이트되었습니다/i)).toBeVisible({ timeout: 15000 });
    console.log('Declaration approved successfully');

    // Final verification in the list
    const approvedRow = page.locator('tr').filter({ hasText: TEST_ORDER_NO }).filter({ hasText: '통관 승인' }).first();
    await expect(approvedRow).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'docs/99_Manual/E2E_07_Result/e2e_07_final_success.png', fullPage: true });
    console.log('E2E-07 Customs Declaration Lifecycle Test Passed!');
  });
});
