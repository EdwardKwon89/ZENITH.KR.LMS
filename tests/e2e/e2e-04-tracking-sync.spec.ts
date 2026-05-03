import { test, expect } from '@playwright/test';

test.describe('E2E-04: Tracking Sync & Notification Engine', () => {
  const adminEmail = 'temp_admin@zenith.kr';
  const adminPassword = 'password123';
  const targetOrderNo = 'Z-HOU-E2E03-01';
  const trackingNo = 'TRK-E2E04-API-01';

  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto('/ko/login');
    await page.fill('input#email', adminEmail);
    await page.fill('input#password', adminPassword);
    await page.click('button[data-action="login"]');
    
    // Wait for navigation after login (can be dashboard or orders depending on profile)
    await expect(page).toHaveURL(/.*(dashboard|orders)/);
  });

  test('should synchronize external tracking data and update status', async ({ page }) => {
    // 2. Navigate to Tracking Dashboard
    await page.goto('/ko/tracking');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'scratch/e2e_04_01_tracking_list_before.png' });
    
    // 3. Search for the target order
    const searchInput = page.locator('input[placeholder*="Search Order"]');
    await searchInput.fill(targetOrderNo);
    await page.keyboard.press('Enter');
    
    // Verify target order is in the list
    await expect(page.locator(`text=${targetOrderNo}`)).toBeVisible();
    await page.screenshot({ path: 'scratch/e2e_04_02_search_result.png' });
    
    // 4. Click Sync All API
    const syncButton = page.locator('button:has-text("Sync All API")');
    await syncButton.click();
    
    // 5. Wait for sync completion (overlay should disappear)
    await expect(page.locator('text=Syncing external data...')).toBeVisible();
    await expect(page.locator('text=Syncing external data...')).not.toBeVisible({ timeout: 20000 });
    
    // 6. Verify status update in the table
    await page.screenshot({ path: 'scratch/e2e_04_03_after_sync.png' });
    await expect(page.locator(`tr:has-text("${targetOrderNo}")`)).toContainText('API');
    
    // 7. Navigate to Detail page to verify milestone
    await page.click(`tr:has-text("${targetOrderNo}") a:has-text("Detail")`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`.*orders/.*`));
    
    // Scroll to timeline if needed
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.screenshot({ path: 'scratch/e2e_04_04_tracking_timeline.png' });
  });
});
