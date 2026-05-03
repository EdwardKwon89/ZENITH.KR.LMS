import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const LOCALE = 'ko';
const TIMESTAMP = Date.now();
const TEST_EMAIL = `e2e_02_${TIMESTAMP}@zenith.kr`;
const ORG_NAME = `E2E 02 Corp ${TIMESTAMP}`;
const ADMIN_EMAIL = 'temp_admin@zenith.kr';
const PASSWORD = 'password1234';
const ADMIN_PASSWORD = 'admin1234';

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`BROWSER_LOG: ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER_ERROR: ${err.message}`));

  try {
    console.log('--- Step 1: Shipper Registration ---');
    await page.goto(`${BASE_URL}/${LOCALE}/register`, { waitUntil: 'networkidle', timeout: 60000 });
    
    await page.click('button:has-text("법인회원")');
    await page.click('button:has-text("다음 단계로")');
    await page.click('button:has-text("신규 법인 등록")');

    await page.fill('input[placeholder="법인 명칭 (상호명)"]', ORG_NAME);
    await page.fill('input[placeholder="사업자등록번호 (숫자만)"]', '2223344444');
    await page.click('button:has-text("다음 단계로")');

    await page.fill('input[placeholder="이름 (성함)"]', 'E2E 02 Tester');
    await page.fill('input[placeholder="이메일 주소"]', TEST_EMAIL);
    await page.fill('input[placeholder="비밀번호"]', PASSWORD);
    await page.click('button:has-text("다음 단계로")');

    const filePath = path.resolve('scratch/business_license.pdf');
    await page.setInputFiles('input[type="file"]', filePath);
    
    await page.click('button:has-text("가입 신청 완료")');
    await page.waitForURL(new RegExp(`/${LOCALE}/register/pending`), { timeout: 30000 });
    await page.screenshot({ path: 'scratch/e2e_02_01_registration_pending.png' });
    console.log('Registration submitted.');

    console.log('--- Step 2: Admin Approval ---');
    await page.goto(`${BASE_URL}/${LOCALE}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/${LOCALE}/(admin|dashboard|orders)`));

    await page.goto(`${BASE_URL}/${LOCALE}/admin/organizations`);
    
    // Handle Dialogs
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    await page.waitForSelector(`text=${ORG_NAME}`, { timeout: 30000 });
    const orgCard = page.locator('.bg-white').filter({ hasText: ORG_NAME }).first();
    await orgCard.locator('button:has-text("법인 최종 승인")').first().click();

    await page.waitForTimeout(2000); 
    await page.screenshot({ path: 'scratch/e2e_02_02_admin_approved.png' });
    console.log('Admin approved shipper.');

    console.log('--- Step 3: B2C Order Placement ---');
    await context.clearCookies();
    await page.goto(`${BASE_URL}/${LOCALE}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/${LOCALE}/orders`));

    await page.goto(`${BASE_URL}/${LOCALE}/orders/new`);
    console.log('Navigated to Order New page.');

    // Fill Cargo Info
    console.log('Filling Cargo Info...');
    
    // Select Transport Mode: AIR (default is AIR, but let's click it to be sure)
    await page.click('button:has-text("항공")');
    await page.waitForTimeout(500); // Wait for filtering

    // Select Origin Port: ICN
    console.log('Selecting Origin Port...');
    const originPortId = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('select[name="origin_port_id"] option'));
      const target = options.find(opt => opt.textContent.includes('ICN'));
      return target ? target.value : null;
    });
    if (!originPortId) throw new Error('ICN port not found in select options');
    await page.selectOption('select[name="origin_port_id"]', originPortId);
    
    // Select Destination Port: LAX
    console.log('Selecting Destination Port...');
    const destPortId = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('select[name="dest_port_id"] option'));
      const target = options.find(opt => opt.textContent.includes('LAX'));
      return target ? target.value : null;
    });
    if (!destPortId) throw new Error('LAX port not found in select options');
    await page.selectOption('select[name="dest_port_id"]', destPortId);

    // Fill Recipient Info (Required for B2C)
    console.log('Filling Recipient Info...');
    await page.fill('input[name="recipient_name"]', 'E2E Receiver');
    await page.fill('input[name="recipient_phone"]', '010-1234-5678');
    await page.fill('textarea[name="recipient_address"]', '123 Test St, Los Angeles, CA, USA');
    
    // Fill Package Info
    console.log('Filling Package Info...');
    
    // Fill Weight
    const weightInput = page.locator('input[name="packages.0.gross_weight"]');
    await weightInput.click();
    await weightInput.fill(''); // Clear first
    await weightInput.type('25', { delay: 100 });
    await weightInput.press('Enter');
    await weightInput.dispatchEvent('blur');
    
    // Fill Dimensions
    const lengthInput = page.locator('input[name="packages.0.length"]');
    await lengthInput.click();
    await lengthInput.fill('');
    await lengthInput.type('50', { delay: 100 });
    await lengthInput.press('Enter');

    const widthInput = page.locator('input[name="packages.0.width"]');
    await widthInput.click();
    await widthInput.fill('');
    await widthInput.type('40', { delay: 100 });
    await widthInput.press('Enter');

    const heightInput = page.locator('input[name="packages.0.height"]');
    await heightInput.click();
    await heightInput.fill('');
    await heightInput.type('30', { delay: 100 });
    await heightInput.press('Enter');
    
    // Final triggers
    await page.click('body');
    await page.waitForTimeout(2000);

    // Fill Items
    await page.fill('input[name="packages.0.items.0.item_name"]', 'Test Gadget');
    await page.fill('input[name="packages.0.items.0.quantity"]', '5');

    await page.screenshot({ path: 'scratch/e2e_02_03_order_info_filled.png' });

    // Step 4: Verify Fare Calculation (Live in UI)
    console.log('Verifying live fare calculation...');
    await page.waitForTimeout(5000); 
    
    // Check Total Weight as a proxy for state update
    const totalWeightText = await page.innerText('p.text-xl.font-black >> nth=0');
    console.log(`Total Weight shown in summary: ${totalWeightText}`);
    
    const freightValue = await page.innerText('p.text-2xl.font-black.text-indigo-400');
    console.log(`Estimated Freight: ${freightValue}`);
    
    await page.screenshot({ path: 'scratch/e2e_02_04_fare_calculated.png' });

    // proceed if Total Weight is updated (which means watchedPackages is working)
    if (totalWeightText.includes('0.00')) {
       console.log('Error: Total weight not updated. RHF watched state might be failing.');
       // Try one more time with a direct evaluate if it still fails
       await page.evaluate(() => {
         const input = document.querySelector('input[name="packages.0.gross_weight"]');
         if (input) {
           input.dispatchEvent(new Event('input', { bubbles: true }));
           input.dispatchEvent(new Event('change', { bubbles: true }));
           input.dispatchEvent(new Event('blur', { bubbles: true }));
         }
       });
       await page.waitForTimeout(2000);
       const retryWeight = await page.innerText('p.text-xl.font-black >> nth=0');
       if (retryWeight.includes('0.00')) {
         throw new Error('Form state update failed even after retry');
       }
    }

    // Step 5: Confirm Order
    console.log('Confirming order...');
    await page.click('button:has-text("오더 등록하기")');

    // Expected Result: Redirect to /ko/orders and see new order
    await page.waitForTimeout(5000); 
    await page.screenshot({ path: 'scratch/e2e_02_05_order_confirmed.png' });
    
    // Check for success or specific error toast if navigation didn't happen
    const bodyText = await page.innerText('body');
    if (bodyText.includes('필수 항목') || bodyText.includes('Error')) {
       console.log('Validation or Server Error detected!');
       await page.screenshot({ path: 'scratch/e2e_02_validation_error.png' });
       throw new Error('Order submission failed due to validation or server error');
    }

    // Final check for navigation
    try {
      await page.waitForURL(new RegExp(`/${LOCALE}/orders/`), { timeout: 15000 });
      console.log('Order detail page reached.');
    } catch (e) {
      console.log('Navigation to detail page failed. Checking for validation errors in console...');
      await page.screenshot({ path: 'scratch/e2e_02_failed_navigation.png' });
      throw e;
    }
    
    await page.screenshot({ path: 'scratch/e2e_02_06_final_verify.png' });
    console.log('Verification successful.');





  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'scratch/e2e_02_error.png' });
  } finally {
    await browser.close();
  }
}

runTest();
