import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_03_Result/RERUN_2026-05-22';

test('E2E-03 Step 4: Inventory Outbound Scan', async ({ page }) => {
  test.setTimeout(90000);
  const adminEmail = 'admin@zenith.kr';
  const adminPassword = 'password1234';
  const targetOrderNo = 'Z-HOU-E2E03-01';

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 1. Login
  await page.goto('/ko/login');
  await page.fill('input#email', adminEmail);
  await page.fill('input#password', adminPassword);
  await page.click('button[data-action="login"]');
  await page.waitForURL(/.*(dashboard|orders)/);

  // 2. Go to Inventory
  await page.goto('/ko/inventory', { timeout: 60000 });
  await page.waitForLoadState('networkidle');

  // 3. Perform Outbound Scan
  const outboundBtn = page.locator('button:has-text("OUTBOUND")');
  await outboundBtn.click();
  
  const scanInput = page.locator('input[placeholder*="Waiting for scan"]');
  await scanInput.fill(targetOrderNo);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');

  // 4. Verify Success Toast
  await expect(page.locator('text=Successfully processed')).toBeVisible({ timeout: 15000 });
  
  // 5. Navigate to Order List to verify status change (DoD: IN_TRANSIT)
  await page.goto('/ko/orders');
  await page.waitForLoadState('networkidle');
  
  const searchInput = page.locator('input[placeholder*="Order No"]');
  await searchInput.fill(targetOrderNo);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  
  const targetRow = page.locator(`tr:has-text("${targetOrderNo}")`);
  await expect(targetRow).toBeVisible();
  
  // Status check (IN_TRANSIT or 운송중)
  const rowText = await targetRow.innerText();
  console.log(`Order status after scan: ${rowText}`);
  expect(rowText.toUpperCase()).toMatch(/IN_TRANSIT|운송중/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_outbound_success.png') });
});

