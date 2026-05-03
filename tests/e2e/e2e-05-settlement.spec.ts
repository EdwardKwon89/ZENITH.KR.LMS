import { test, expect } from '@playwright/test';

test.describe('E2E-05: Settlement & Finance Workflow', () => {
  const TEST_ORDER_NO = 'Z-FIN-E2E05-01';
  const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';
  const ADMIN_EMAIL = 'admin@zenith.kr';
  const PASSWORD = 'password1234';

  test.beforeEach(async ({ page }) => {
    // Capture browser logs
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });

    console.log(`Logging in as ${ADMIN_EMAIL}...`);
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*(dashboard|orders)/);
    console.log('Login successful.');
  });

  test('should calculate settlement and generate invoice for a completed order', async ({ page }) => {
    const currentUrl = page.url();
    const locale = currentUrl.includes('/ko') ? 'ko' : 'en';
    const orderUrl = `/${locale}/orders/${TEST_ORDER_ID}`;
    
    console.log(`Navigating to order detail: ${orderUrl}`);
    await page.goto(orderUrl);

    // Verify order number
    await expect(page.locator('h1')).toContainText(TEST_ORDER_NO);
    console.log(`Arrived at order ${TEST_ORDER_NO} detail page.`);

    // Finance Section
    const financeSection = page.locator('h3:has-text("Settlement Preview")').locator('..').locator('..');
    await expect(financeSection).toBeVisible();

    // Check for costs
    const costItemsSelector = '.text-slate-400.text-sm';
    let costCount = await financeSection.locator(costItemsSelector).count();
    console.log(`Initial cost count: ${costCount}`);
    
    if (costCount === 0) {
      console.log('No costs found. Triggering recalculation...');
      const calcButton = financeSection.locator('button[title="Recalculate Costs"]');
      await expect(calcButton).toBeVisible();
      
      // Listen for network responses to server actions
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('finance') || response.request().method() === 'POST'
      );
      
      await calcButton.click();
      console.log('Clicked recalculate. Waiting for response...');
      
      try {
        await responsePromise;
        console.log('Server action response received.');
      } catch (e) {
        console.warn('Timeout or error waiting for server action response.');
      }
      
      // Wait for at least one cost item to appear
      console.log('Waiting for costs to appear in UI...');
      try {
        await expect(financeSection.locator(costItemsSelector).first()).toBeVisible({ timeout: 15000 });
        costCount = await financeSection.locator(costItemsSelector).count();
        console.log(`Costs updated. New count: ${costCount}`);
      } catch (e) {
        console.error('FAILED: Costs did not appear after recalculation.');
        // Take a screenshot for debugging if possible (though I can't see it directly, it helps in local runs)
        await page.screenshot({ path: 'settlement-failure.png' });
        throw e;
      }
    }

    // Verify Generate Final Invoice button is enabled
    const generateButton = page.locator('button:has-text("Generate Final Invoice")');
    
    // If already invoiced, we skip generation but verify existence
    const invoicedBadge = page.locator('text=Invoiced');
    const isAlreadyInvoiced = await invoicedBadge.isVisible();

    if (!isAlreadyInvoiced) {
      console.log('Order is not yet invoiced. Checking if generate button is enabled...');
      await expect(generateButton).toBeEnabled({ timeout: 5000 });
      console.log('Generating final invoice...');
      await generateButton.click();

      // Verify success status
      await expect(page.locator('text=Invoiced')).toBeVisible({ timeout: 15000 });
      console.log('Invoice generated successfully.');
    } else {
      console.log('Order already invoiced.');
    }
    
    // Verify Invoice Number
    const invoiceNo = page.locator('span.text-blue-400:has-text("#")');
    await expect(invoiceNo).toBeVisible();
    const invoiceText = await invoiceNo.innerText();
    console.log(`Verified Invoice: ${invoiceText}`);

    // Verify in Finance Dashboard
    console.log('Navigating to Finance Dashboard for final verification...');
    await page.goto(`/${locale}/finance`);
    await expect(page.locator('h1')).toContainText(locale === 'ko' ? '재무 현황' : 'Financial Status');
    
    const cleanInvoiceNo = invoiceText.replace('#', '');
    await expect(page.locator(`text=${cleanInvoiceNo}`).first()).toBeVisible();
    console.log(`Invoice ${cleanInvoiceNo} found in Finance Dashboard. Test Passed.`);
  });
});
