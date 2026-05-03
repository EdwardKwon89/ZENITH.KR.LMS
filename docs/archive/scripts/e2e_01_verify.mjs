import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const LOCALE = 'ko';
const TIMESTAMP = Date.now();
const TEST_EMAIL = `test_e2e_${TIMESTAMP}@zenith.kr`;
const ORG_NAME = `E2E Test Corp ${TIMESTAMP}`;
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
    console.log('--- Step 1: Corporate Registration ---');
    await page.goto(`${BASE_URL}/${LOCALE}/register`, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Step: TYPE
    console.log('Selecting Corporate User Type...');
    await page.click('button:has-text("법인회원")');
    await page.click('button:has-text("다음 단계로")');

    // Step: ORG_JOIN
    console.log('Selecting Org Creation...');
    await page.click('button:has-text("신규 법인 등록")');

    // Step: ORG_CREATE
    console.log('Filling Org Info...');
    await page.fill('input[placeholder="법인 명칭 (상호명)"]', ORG_NAME);
    await page.fill('input[placeholder="사업자등록번호 (숫자만)"]', '1234567890');
    await page.click('button:has-text("다음 단계로")');

    // Step: INFO
    console.log('Filling User Info...');
    await page.fill('input[placeholder="이름 (성함)"]', 'E2E Tester');
    await page.fill('input[placeholder="이메일 주소"]', TEST_EMAIL);
    await page.fill('input[placeholder="비밀번호"]', PASSWORD);
    await page.click('button:has-text("다음 단계로")');

    // Step: DOCS
    console.log('Uploading Documents...');
    const filePath = path.resolve('scratch/business_license.pdf');
    await page.setInputFiles('input[type="file"]', filePath);
    
    console.log('Submitting Registration...');
    const submitBtn = page.locator('button:has-text("가입 신청 완료")');
    await submitBtn.click();
    console.log('Submit button clicked. Waiting for response...');

    // Verify Completion
    console.log('Verifying Registration Completion...');
    try {
      // For corporate users, it redirects to /pending
      await page.waitForURL(new RegExp(`/${LOCALE}/register/pending`), { timeout: 30000 });
      console.log('Redirected to pending page.');
      
      await page.waitForSelector('text=가입 심사 중', { timeout: 20000 });
      await page.screenshot({ path: 'scratch/e2e_01_registration_pending.png' });
      console.log('Registration submitted successfully (Pending state).');
    } catch (e) {
      console.log('Failed to see success/pending message. Checking for errors on page...');
      const errorText = await page.innerText('.text-red-500').catch(() => 'No error text found');
      console.log('Error text on page:', errorText);
      await page.screenshot({ path: 'scratch/e2e_01_registration_failed_debug.png' });
      throw e;
    }

    console.log('--- Step 2: Admin Approval ---');
    // Login as Admin
    await page.goto(`${BASE_URL}/${LOCALE}/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/${LOCALE}/orders|admin|dashboard`));

    // Go to Admin Organizations
    await page.goto(`${BASE_URL}/${LOCALE}/admin/organizations`);
    console.log(`Navigated to Admin Organizations page: ${BASE_URL}/${LOCALE}/admin/organizations`);

    // Handle Dialogs
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    // Find our org and approve
    console.log(`Searching for organization: ${ORG_NAME}`);
    
    // Take a debug screenshot to see what the admin page looks like
    await page.waitForTimeout(3000); 
    await page.screenshot({ path: 'scratch/e2e_01_admin_debug_pre_search.png' });
    
    // Explicitly wait for the organization name to appear in the DOM
    try {
      // Use a more specific locator if possible, or just wait for the text
      await page.waitForSelector(`text=${ORG_NAME}`, { timeout: 30000 });
      console.log('Found organization text in DOM.');
    } catch (e) {
      console.log('waitForSelector failed, taking error screenshot and logging DOM');
      await page.screenshot({ path: 'scratch/e2e_01_admin_search_error.png' });
      const html = await page.content();
      fs.writeFileSync('scratch/e2e_01_admin_dom_error.html', html);
      throw e;
    }
    
    // The card locator
    const orgCard = page.locator('.zen-glass').filter({ hasText: ORG_NAME }).first();
    await orgCard.scrollIntoViewIfNeeded({ timeout: 10000 });
    
    const approveBtn = orgCard.locator('button:has-text("법인 최종 승인")').first();
    await approveBtn.click();

    // Wait for approval reflected (re-fetch happens after alert)
    console.log('Waiting for approval to complete...');
    await page.waitForTimeout(3000); // Wait for re-fetch
    await page.screenshot({ path: 'scratch/e2e_01_admin_approved.png' });
    console.log('Admin approval process completed.');

    console.log('--- Step 3: Verified User Login Check ---');
    // Logout and Login as the new user
    await context.clearCookies();
    await page.goto(`${BASE_URL}/${LOCALE}/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    
    // Check if redirected to orders (indicating success)
    try {
      await page.waitForURL(new RegExp(`/${LOCALE}/orders`), { timeout: 15000 });
      console.log('User successfully logged in after approval.');
      // [REWORK-E2E-01-02] Step 3 화주 로그인 성공 후 /ko/orders 리다이렉트 확인 스크린샷 추가
      await page.screenshot({ path: 'scratch/e2e_01_login_success.png' });
    } catch (e) {
      console.log('User login failed or redirected elsewhere.');
      await page.screenshot({ path: 'scratch/e2e_01_login_failed.png' });
      throw e;
    }

    // [REWORK-E2E-01-03] Step 8 권한 접근 제어 검증 코드 추가
    console.log('Step 8: Verifying access control (Shipper trying to access admin URL)...');
    // 화주 세션 유지 상태에서 admin URL 직접 접근
    await page.goto(`${BASE_URL}/${LOCALE}/admin/customs`, { waitUntil: 'networkidle' });
    
    // 403 또는 dashboard 리다이렉트 확인
    const finalUrl = page.url();
    console.log(`Access check final URL: ${finalUrl}`);
    
    // Assertion: URL should not contain '/admin/'
    console.assert(!finalUrl.includes('/admin/'), 'Access control failed: admin URL accessible by shipper');
    
    if (finalUrl.includes('/admin/')) {
      console.error('ACCESS_CONTROL_FAILED: Shipper can access admin URL!');
      await page.screenshot({ path: 'scratch/e2e_01_access_control_FAILED.png' });
      throw new Error('Access control verification failed');
    } else {
      console.log('Access control verified: Shipper redirected away from admin URL.');
      await page.screenshot({ path: 'scratch/e2e_01_access_control_success.png' });
    }

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'scratch/e2e_01_error.png' });
  } finally {
    await browser.close();
  }
}

runTest();
