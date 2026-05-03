import { test, expect } from '@playwright/test';

test.describe('E2E-04: Tracking Sync & Notification Engine', () => {
  test.setTimeout(90000);
  const adminEmail = 'admin@zenith.kr';
  const adminPassword = 'password1234';
  const targetOrderNo = 'Z-HOU-E2E03-01';
  const trackingNo = 'TRK-E2E04-API-01';

  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto('/ko/login');
    await page.fill('input#email', adminEmail);
    await page.fill('input#password', adminPassword);
    
    // Screenshot before login attempt
    await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_00_login_before.png' });
    
    await page.click('button[data-action="login"]');
    
    // Wait for either success navigation or error alert
    await Promise.race([
      page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
      page.waitForSelector('.alert-error', { timeout: 30000 }).then(() => { throw new Error('Login failed with error alert'); })
    ]);
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_00_login_after.png' });
  });

  test('should synchronize external tracking data and update status', async ({ page }) => {
    // 2. Navigate to Tracking Dashboard
    await page.goto('/ko/tracking', { timeout: 60000 });
    await page.waitForLoadState('networkidle');
    
    // Wait for list to be loaded
    await page.waitForSelector('table', { timeout: 20000 });
    await page.waitForTimeout(5000);
    
    // Debug: Print all order numbers in the list
    const orderNumbers = await page.locator('tbody tr td:first-child p.font-bold').allInnerTexts();
    console.log(`Current Order Numbers in list: ${orderNumbers.join(', ')}`);
    
    await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_01_tracking_list_before.png' });
    
    // 3. Search for the target order
    const searchInput = page.locator('input[placeholder*="Search Order"]');
    await searchInput.fill(targetOrderNo);
    await page.keyboard.press('Enter');
    
    // Wait for network after search
    await page.waitForTimeout(3000);
    
    // Verify target order is in the list
    const orderCell = page.locator(`text=${targetOrderNo}`);
    try {
      await expect(orderCell).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('Order not found in list. Current list content:');
      const allText = await page.locator('tbody').innerText();
      console.log(allText);
      await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_debug_not_found.png' });
      throw e;
    }
    
    await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_02_search_result.png' });
    
    // 4. Click Sync All API
    const syncButton = page.locator('button:has-text("Sync All API")');
    await syncButton.click();
    
    // 5. Wait for sync completion
    await page.waitForSelector('text=Syncing external data...', { state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForSelector('text=Syncing external data...', { state: 'hidden', timeout: 40000 });
    
    // 6. Verify status update in the table
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_03_after_sync.png' });
    
    const targetRow = page.locator(`tr:has-text("${targetOrderNo}")`);
    await expect(targetRow).toContainText('API');
    
    // 7. Navigate to Detail page
    const detailLink = targetRow.locator('a:has-text("Detail")');
    const href = await detailLink.getAttribute('href');
    console.log(`Navigating to detail: ${href}`);
    
    if (href) {
      await page.goto(href);
    } else {
      await detailLink.click();
    }
    
    // Wait for navigation
    await page.waitForURL(/.*orders\/.*/, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`.*orders/.*`));
    
    // Scroll to timeline if needed
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/99_Manual/E2E_04_Result/e2e_04_04_tracking_timeline.png' });
  });
});
