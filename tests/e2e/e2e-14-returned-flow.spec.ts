import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@zenith.kr';
const PASSWORD = 'password1234';

async function findWarehousedRow(page: any, startIndex = 0) {
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = startIndex; i < count; i++) {
    const statusText = await rows.nth(i).locator('td').nth(4).innerText();
    if (statusText.includes('입고완료') || statusText.toUpperCase().includes('WAREHOUSED')) {
      return rows.nth(i);
    }
  }
  return null;
}

async function findRowByStatus(page: any, keyword: string, startIndex = 0) {
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = startIndex; i < count; i++) {
    const statusText = await rows.nth(i).locator('td').nth(4).innerText();
    if (statusText.includes(keyword) || statusText.toUpperCase().includes(keyword.toUpperCase())) {
      return rows.nth(i);
    }
  }
  return null;
}

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

    // Find the first WAREHOUSED order row
    const targetRow = await findWarehousedRow(page);
    expect(targetRow).not.toBeNull();
    const statusBadge = targetRow.locator('td').nth(4).locator('span');
    await expect(statusBadge).toBeVisible();

    // 3. Click status badge to open StatusChangeModal
    console.log('Step 3: Open StatusChangeModal');
    await statusBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    // 4. Select RETURNED from available options
    console.log('Step 4: Select RETURNED status');
    const returnedBtn = page.locator('button').filter({ hasText: /RETURNED|반송/ }).first();
    await expect(returnedBtn).toBeVisible({ timeout: 10000 });
    await returnedBtn.click();

    // 5. Confirm status change
    console.log('Step 5: Confirm update');
    const updateBtn = page.locator('button').filter({ hasText: '상태 업데이트' });
    await expect(updateBtn).toBeEnabled();
    await updateBtn.scrollIntoViewIfNeeded();
    await updateBtn.click();

    // Wait for modal to close
    await expect(page.locator('h3:has-text("상태 변경")')).not.toBeVisible({ timeout: 10000 });

    // 6. Verify RETURNED badge is shown
    console.log('Step 6: Verify RETURNED badge');
    await page.reload();
    await page.waitForLoadState('networkidle');

    const returnedRow = await findRowByStatus(page, '반송');
    expect(returnedRow).not.toBeNull();
    const returnedBadge = returnedRow.locator('td').nth(4);
    const returnedText = await returnedBadge.innerText();
    console.log(`Status after RETURNED transition: ${returnedText}`);
    expect(returnedText.toUpperCase()).toMatch(/RETURNED|반송/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_a_01_returned_badge.png', fullPage: true });

    // 7. Re-open modal and check available transitions
    console.log('Step 7: Verify transition options from RETURNED');
    const returnedStatusBadge = returnedRow.locator('td').nth(4).locator('span');
    await returnedStatusBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    // Verify 3 options are visible in modal
    await expect(page.locator('button:has-text("입고완료")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').filter({ hasText: /CANCELED|취소/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button').filter({ hasText: /DISPOSED|폐기/ }).first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_a_02_transition_options.png', fullPage: true });

    // 8. Select WAREHOUSED and confirm
    console.log('Step 8: RETURNED → WAREHOUSED');
    await page.locator('button').filter({ hasText: /WAREHOUSED|입고완료/ }).first().click();
    const updateBtnB = page.locator('button').filter({ hasText: '상태 업데이트' });
    await updateBtnB.scrollIntoViewIfNeeded();
    await updateBtnB.click();
    await expect(page.locator('h3:has-text("상태 변경")')).not.toBeVisible({ timeout: 10000 });

    // 9. Verify WAREHOUSED badge
    await page.reload();
    await page.waitForLoadState('networkidle');
    const warehousedFinalRow = await findRowByStatus(page, '입고완료');
    expect(warehousedFinalRow).not.toBeNull();
    const warehousedText = await warehousedFinalRow.locator('td').nth(4).innerText();
    console.log(`Status after WAREHOUSED transition: ${warehousedText}`);
    expect(warehousedText.toUpperCase()).toMatch(/WAREHOUSED|입고완료/);

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

    // 2. Navigate to a different WAREHOUSED order for Case B
    console.log('Step 2: Navigate to orders');
    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');

    const targetRow = await findWarehousedRow(page, 0);
    expect(targetRow).not.toBeNull();
    const statusBadge = targetRow.locator('td').nth(4).locator('span');

    // 3. Transition to RETURNED
    console.log('Step 3: Transition to RETURNED');
    await statusBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    const returnedBtn = page.locator('button').filter({ hasText: /RETURNED|반송/ }).first();
    await expect(returnedBtn).toBeVisible({ timeout: 10000 });
    await returnedBtn.click();
    const updateBtnC = page.locator('button').filter({ hasText: '상태 업데이트' });
    await updateBtnC.scrollIntoViewIfNeeded();
    await updateBtnC.click();
    await expect(page.locator('h3:has-text("상태 변경")')).not.toBeVisible({ timeout: 10000 });

    // 4. Verify RETURNED
    await page.reload();
    await page.waitForLoadState('networkidle');
    const returnedRowB = await findRowByStatus(page, '반송');
    expect(returnedRowB).not.toBeNull();
    const returnedText = await returnedRowB.locator('td').nth(4).innerText();
    console.log(`Status after RETURNED: ${returnedText}`);
    expect(returnedText.toUpperCase()).toMatch(/RETURNED|반송/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_b_01_returned_badge.png', fullPage: true });

    // 5. Open modal → select DISPOSED
    console.log('Step 5: RETURNED → DISPOSED');
    const returnedBadge = returnedRowB.locator('td').nth(4).locator('span');
    await returnedBadge.click();
    await page.waitForSelector('h3:has-text("상태 변경")', { timeout: 10000 });

    await expect(page.locator('button').filter({ hasText: /DISPOSED|폐기/ }).first()).toBeVisible({ timeout: 5000 });
    await page.locator('button').filter({ hasText: /DISPOSED|폐기/ }).first().click();
    const updateBtnD = page.locator('button').filter({ hasText: '상태 업데이트' });
    await updateBtnD.scrollIntoViewIfNeeded();
    await updateBtnD.click();
    await expect(page.locator('h3:has-text("상태 변경")')).not.toBeVisible({ timeout: 10000 });

    // 6. Verify DISPOSED badge
    await page.reload();
    await page.waitForLoadState('networkidle');
    const disposedRow = await findRowByStatus(page, '폐기');
    expect(disposedRow).not.toBeNull();
    const disposedText = await disposedRow.locator('td').nth(4).innerText();
    console.log(`Status after DISPOSED transition: ${disposedText}`);
    expect(disposedText.toUpperCase()).toMatch(/DISPOSED|폐기/);

    await page.screenshot({ path: 'docs/99_Manual/E2E_14_Result/e2e_14_b_02_disposed_final.png', fullPage: true });
    console.log('Case B PASSED: RETURNED → DISPOSED');
  });
});
