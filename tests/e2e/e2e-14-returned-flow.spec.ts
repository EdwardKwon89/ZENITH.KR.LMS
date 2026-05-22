import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@zenith.kr';
const PASSWORD = 'password1234';

test.describe('E2E-14: RETURNED State Transition Flow', () => {
  test('Case A: RETURNED → WAREHOUSED (재입고)', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // 1. Login as admin
    console.log('Step 1: Admin login');
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    // 2. Navigate to orders list
    console.log('Step 2: Navigate to orders');
    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');

    // Find the first order row with a status badge that can be clicked
    const firstOrderRow = page.locator('tbody tr').first();
    await expect(firstOrderRow).toBeVisible({ timeout: 15000 });

    // Get the status badge cell (5th column)
    const statusBadge = firstOrderRow.locator('td').nth(4).locator('span');
    await expect(statusBadge).toBeVisible();

    // 3. Click status badge to open StatusChangeModal
    console.log('Step 3: Open StatusChangeModal');
    await statusBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    // 4. Select RETURNED from available options
    console.log('Step 4: Select RETURNED status');
    const returnedBtn = page.locator('button').filter({ hasText: /RETURNED|반송됨/ });
    await expect(returnedBtn).toBeVisible({ timeout: 10000 });
    await returnedBtn.click();

    // 5. Confirm status change
    console.log('Step 5: Confirm update');
    const updateBtn = page.locator('button').filter({ hasText: '상태 업데이트' });
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();

    // Wait for toast and modal close
    await page.waitForTimeout(3000);

    // 6. Verify RETURNED badge is shown
    console.log('Step 6: Verify RETURNED badge');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const returnedRow = page.locator('tbody tr').first();
    const returnedBadge = returnedRow.locator('td').nth(4);
    const returnedText = await returnedBadge.innerText();
    console.log(`Status after RETURNED transition: ${returnedText}`);
    expect(returnedText.toUpperCase()).toMatch(/RETURNED|반송됨/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_a_01_returned_badge.png', fullPage: true });

    // 7. Re-open modal and check available transitions
    console.log('Step 7: Verify transition options from RETURNED');
    const returnedStatusBadge = returnedRow.locator('td').nth(4).locator('span');
    await returnedStatusBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    // Verify 3 options: WAREHOUSED, CANCELED, DISPOSED
    await expect(page.locator('button').filter({ hasText: /WAREHOUSED|입고됨/ })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').filter({ hasText: /CANCELED|취소됨/ })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').filter({ hasText: /DISPOSED|폐기됨/ })).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_a_02_transition_options.png', fullPage: true });

    // 8. Select WAREHOUSED and confirm
    console.log('Step 8: RETURNED → WAREHOUSED');
    await page.locator('button').filter({ hasText: /WAREHOUSED|입고됨/ }).click();
    await page.locator('button').filter({ hasText: '상태 업데이트' }).click();
    await page.waitForTimeout(3000);

    // 9. Verify WAREHOUSED badge
    await page.reload();
    await page.waitForLoadState('networkidle');
    const warehousedText = await page.locator('tbody tr').first().locator('td').nth(4).innerText();
    console.log(`Status after WAREHOUSED transition: ${warehousedText}`);
    expect(warehousedText.toUpperCase()).toMatch(/WAREHOUSED|입고됨/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_a_03_warehoused_final.png', fullPage: true });
    console.log('Case A PASSED: RETURNED → WAREHOUSED');
  });

  test('Case B: RETURNED → DISPOSED (폐기)', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // 1. Login as admin
    console.log('Step 1: Admin login');
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    // 2. Navigate to a different order for Case B
    console.log('Step 2: Navigate to orders');
    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');

    const secondOrderRow = page.locator('tbody tr').nth(1);
    await expect(secondOrderRow).toBeVisible({ timeout: 15000 });

    const statusBadge = secondOrderRow.locator('td').nth(4).locator('span');

    // 3. Transition to RETURNED
    console.log('Step 3: Transition to RETURNED');
    await statusBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    const returnedBtn = page.locator('button').filter({ hasText: /RETURNED|반송됨/ });
    await expect(returnedBtn).toBeVisible({ timeout: 10000 });
    await returnedBtn.click();
    await page.locator('button').filter({ hasText: '상태 업데이트' }).click();
    await page.waitForTimeout(3000);

    // 4. Verify RETURNED
    await page.reload();
    await page.waitForLoadState('networkidle');
    const returnedText = await page.locator('tbody tr').nth(1).locator('td').nth(4).innerText();
    console.log(`Status after RETURNED: ${returnedText}`);
    expect(returnedText.toUpperCase()).toMatch(/RETURNED|반송됨/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_b_01_returned_badge.png', fullPage: true });

    // 5. Open modal → select DISPOSED
    console.log('Step 5: RETURNED → DISPOSED');
    const returnedBadge = page.locator('tbody tr').nth(1).locator('td').nth(4).locator('span');
    await returnedBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    await expect(page.locator('button').filter({ hasText: /DISPOSED|폐기됨/ })).toBeVisible({ timeout: 5000 });
    await page.locator('button').filter({ hasText: /DISPOSED|폐기됨/ }).click();
    await page.locator('button').filter({ hasText: '상태 업데이트' }).click();
    await page.waitForTimeout(3000);

    // 6. Verify DISPOSED badge
    await page.reload();
    await page.waitForLoadState('networkidle');
    const disposedText = await page.locator('tbody tr').nth(1).locator('td').nth(4).innerText();
    console.log(`Status after DISPOSED transition: ${disposedText}`);
    expect(disposedText.toUpperCase()).toMatch(/DISPOSED|폐기됨/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_b_02_disposed_final.png', fullPage: true });
    console.log('Case B PASSED: RETURNED → DISPOSED');
  });
});
