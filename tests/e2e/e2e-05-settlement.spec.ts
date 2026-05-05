import { test, expect } from '@playwright/test';

test.describe('E2E-05: Settlement & Finance Workflow', () => {
  const TEST_ORDER_NO = 'Z-FIN-E2E05-01';
  const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';
  const ADMIN_EMAIL = 'admin@zenith.kr';
  const PASSWORD = 'password1234';

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
    
    console.log(`Logging in as ${ADMIN_EMAIL}...`);
    await page.goto('/ko/login');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', PASSWORD);
    
    await Promise.all([
      page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
      page.click('button[data-action="login"]')
    ]);
    
    console.log('Login successful.');
  });

  test('Settlement Workflow: Calculate -> Invoice -> Tax Invoice -> Export', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Calculate & Generate Invoice
    const orderUrl = `/ko/orders/${TEST_ORDER_ID}`;
    console.log(`Step 1: Navigating to order detail: ${orderUrl}`);
    await page.goto(orderUrl, { timeout: 60000 });

    const settlementHeader = page.locator('h3:has-text("Settlement Preview"), h3:has-text("정산 미리보기")');
    await settlementHeader.scrollIntoViewIfNeeded();

    // Check if already invoiced FIRST
    const invoicedBadge = page.locator('span:has-text("Invoiced"), span:has-text("청구됨")');
    const isAlreadyInvoiced = await invoicedBadge.isVisible();

    const recalculateBtn = page.locator('button[title="Recalculate Costs"], button[title="비용 재계산"]');
    const noCostsText = page.getByText(/No costs calculated yet/i);
    
    // Only attempt to recalculate if NOT invoiced AND (no costs OR button is visible and enabled)
    if (!isAlreadyInvoiced && (await noCostsText.isVisible() || (await recalculateBtn.isVisible() && await recalculateBtn.isEnabled()))) {
      console.log('Recalculate button found or No Costs message visible. Clicking recalculate...');
      await recalculateBtn.scrollIntoViewIfNeeded();
      await recalculateBtn.click();
      
      // Wait for success toast
      console.log('Waiting for recalculation success toast...');
      await expect(page.getByText(/recalculated successfully/i).or(page.getByText(/정산 비용이 계산되었습니다/i))).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(3000); // Give it a bit more time for state update
    } else {
      console.log('Skipping recalculation: already invoiced, costs present, or button disabled.');
    }

    // 2. Check if already invoiced or generate new one
    const generateBtn = page.locator('button:has-text("Generate Final Invoice"), button:has-text("최종 청구서 생성")');
    
    if (await invoicedBadge.isVisible()) {
      console.log('Order already invoiced. Skipping generation step.');
    } else {
      console.log('Generating invoice...');
      await expect(generateBtn).toBeEnabled({ timeout: 45000 });
      await generateBtn.click();
      
      // Wait for success toast (using a broader match)
      console.log('Waiting for invoice generation success toast...');
      await expect(page.getByText(/generated/i).or(page.getByText(/생성되었습니다/i))).toBeVisible({ timeout: 20000 });
      
      // Verify badge appeared
      await expect(invoicedBadge).toBeVisible({ timeout: 10000 });
    }

    // Capture Invoice Number
    const invoiceLocator = page.locator('span:has-text("#INV-"), span:has-text("INV-")').first();
    await expect(invoiceLocator).toBeVisible({ timeout: 15000 });
    let invoiceNo = (await invoiceLocator.textContent())?.trim() || '';
    // Strip leading '#' if present for searching in the finance table
    if (invoiceNo.startsWith('#')) {
      invoiceNo = invoiceNo.substring(1);
    }
    console.log(`Step 1 Complete. Active Invoice: ${invoiceNo}`);

    // 2. Issue Tax Invoice
    console.log(`Step 2: Navigating to finance dashboard to issue tax invoice for ${invoiceNo}`);
    await page.goto('/ko/finance');
    await page.waitForLoadState('networkidle');
    
    // Find row by invoice number (exact match)
    const invoiceRow = page.locator('tr').filter({ hasText: new RegExp(`^${invoiceNo}$|^${invoiceNo}\\s|\\s${invoiceNo}$|\\s${invoiceNo}\\s`) }).first();
    // If exact match filter is too strict, fall back to simple hasText
    const rowToClick = (await invoiceRow.count() > 0) ? invoiceRow : page.locator('tr').filter({ hasText: invoiceNo }).first();
    
    const taxInvoiceBtn = rowToClick.locator('button[title="Tax Invoice"]');
    await expect(taxInvoiceBtn).toBeVisible({ timeout: 15000 });
    await taxInvoiceBtn.click();

    // Wait for Sheet to be visible
    const sheet = page.locator('h3:has-text("Tax Invoice Management")');
    await expect(sheet).toBeVisible({ timeout: 10000 });

    // Click Issue button in the sheet (Scope it to the sheet)
    const issueBtn = page.locator('div[role="dialog"], .fixed').filter({ has: sheet }).locator('button:has-text("Issue"), button:has-text("발행")').first();
    await expect(issueBtn).toBeEnabled({ timeout: 10000 });
    await issueBtn.click();

    // Verify issuance message
    console.log('Waiting for tax invoice issuance success message...');
    // Use a more specific locator for the toast to avoid strict mode violation with badges in the table
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /발행되었습니다|issued/i }).first()).toBeVisible({ timeout: 20000 });
    
    // Close the sheet before proceeding to Step 3
    console.log('Closing Tax Invoice Management sheet...');
    const closeBtn = page.locator('div[role="dialog"], .fixed').filter({ has: sheet }).locator('button').first();
    await closeBtn.click();
    await expect(sheet).not.toBeVisible({ timeout: 10000 });
    
    console.log('Step 2 Complete. Tax Invoice issued and sheet closed.');

    // 3. Excel Export
    console.log('Step 3: Exporting Excel from finance dashboard');
    
    // Check if table has data
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    console.log(`Finance table has ${rowCount} rows.`);

    const exportBtn = page.locator('button[data-action="export-finance"]');
    console.log('Waiting for export button to be visible...');
    await expect(exportBtn).toBeVisible({ timeout: 15000 });
    
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(e => {
      console.error('Download wait failed:', e.message);
      return null;
    });

    console.log('Clicking export button (force: true)...');
    await exportBtn.click({ force: true });
    
    const download = await downloadPromise;

    if (!download) {
      console.error('No download started. Checking for error messages on page...');
      await page.screenshot({ path: 'docs/99_Manual/E2E_05_Result/e2e_05_export_failed.png' });
      throw new Error('Export failed: No download event triggered');
    }

    expect(download.suggestedFilename()).toMatch(/settlement_export_.*\.xlsx/);
    console.log(`Step 3 Complete. Downloaded: ${download.suggestedFilename()}`);

    await page.screenshot({ path: 'docs/99_Manual/E2E_05_Result/e2e_05_combined_success.png' });
  });
});
