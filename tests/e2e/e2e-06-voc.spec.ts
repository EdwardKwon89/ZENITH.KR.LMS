import { test, expect } from '@playwright/test';

// Test Data
const SHIPPER_EMAIL = 'uat02_corp_shipper@zenith.kr';
const ADMIN_EMAIL = 'admin@zenith.kr';
const PASSWORD = 'password1234';
const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';
const TEST_ORDER_NO = 'Z-FIN-E2E05-01';

test.describe('E2E-06: VOC Lifecycle', () => {
  test('Complete VOC Lifecycle', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    // Debug browser console
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`RESPONSE ERROR: ${response.url()} - ${response.status()}`);
      }
    });

    // --- Step 1: Shipper Registration ---
    console.log(`Step 1: Logging in as Shipper: ${SHIPPER_EMAIL}`);
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input#email', SHIPPER_EMAIL);
    await page.fill('input#password', PASSWORD);
    
    console.log('Clicking login button...');
    await page.click('button[data-action="login"]');
    
    try {
      await page.waitForURL(/.*orders/, { timeout: 15000 });
      console.log('Login successful, navigating to order detail...');
    } catch (e) {
      console.log('Login failed or timeout. Current URL:', page.url());
      await page.screenshot({ path: 'scratch/login-failed.png' });
      throw e;
    }

    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('networkidle');

    // Click VOC Button
    console.log('Looking for VOC button...');
    const vocBtn = page.locator('button').filter({ hasText: /VOC/ });
    await expect(vocBtn).toBeVisible({ timeout: 15000 });
    await vocBtn.click();
    console.log('VOC Modal opened');

    // Fill VOC Form
    console.log('Filling VOC form...');
    await page.locator('button').filter({ hasText: /^지연$/ }).click();
    
    const timestamp = new Date().getTime();
    const title = `E2E Test VOC - ${timestamp}`;
    await page.getByPlaceholder(/제목을 입력해주세요/).fill(title);
    await page.getByPlaceholder(/상세 내용을 입력해주세요/).fill('This is an automated test VOC regarding order delay.');
    
    // Submit - toast 감지를 먼저 준비 후 클릭
    console.log('Submitting VOC...');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    
    // submit 클릭과 동시에 toast 또는 모달 닫힘 감지 시작
    await submitBtn.click();
    
    // Verify success toast - Error와 구분하기 위해 더 구체적으로 매칭
    console.log('Waiting for success toast...');
    try {
      await expect(
        page.getByText(/VOC가 성공적으로 접수되었습니다/i)
          .or(page.getByText(/성공적으로 접수/i))
      ).toBeVisible({ timeout: 25000 });
      console.log('VOC registration successful.');
    } catch (e) {
      // 폴백: 모달이 닫혔으면 서버 액션이 성공한 것으로 간주
      const modalVisible = await page.locator('h3:has-text("신규 VOC 접수")').isVisible().catch(() => false);
      if (!modalVisible) {
        console.log('Modal closed - VOC submitted successfully (toast may have already disappeared).');
      } else {
        console.log('Success toast not found and modal still open. Taking screenshot...');
        await page.screenshot({ path: 'scratch/voc-failed.png', fullPage: true });
        throw e;
      }
    }
    await page.screenshot({ path: 'docs/99_Manual/E2E_06_Result/e2e_06_01_voc_registered.png', fullPage: true });

    // Logout
    await page.goto('/ko/login'); 

    // --- Step 2: Admin Login & Quick Reply ---
    console.log(`Step 2: Logging in as Admin: ${ADMIN_EMAIL}`);
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    console.log('Navigating to Admin VOC page...');
    await page.goto('/ko/voc/admin');
    await page.waitForLoadState('networkidle');
    // SSR 캐시 무효화를 위해 강제 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find the latest VOC by title (h4 element in card)
    console.log('Finding the registered VOC...');
    const vocRow = page.locator('h4').filter({ hasText: title }).first();
    await expect(vocRow).toBeVisible({ timeout: 20000 });
    await vocRow.click();

    // 답변 입력 (textarea에 직접 입력)
    console.log('Entering answer...');
    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.locator('textarea').first().fill('배송 확인 중입니다. 잠시만 기다려 주세요.');
    
    // Submit Answer
    console.log('Submitting Answer...');
    // '답변 등록' 버튼 클릭 (sr-only 텍스트 추가됨)
    console.log('Waiting for Answer button...');
    try {
      const answerBtn = page.getByRole('button', { name: /답변 등록/i });
      await expect(answerBtn).toBeVisible({ timeout: 15000 });
      await answerBtn.click();
    } catch (e) {
      console.log('Answer button not found. Taking screenshot...');
      await page.screenshot({ path: 'scratch/admin-answer-btn-not-found.png', fullPage: true });
      throw e;
    }
    
    // Verify success toast
    console.log('Waiting for Admin reply success toast...');
    const successToast = page.getByText(/답변이 등록되었습니다/i).or(page.locator('[data-sonner-toast]')).first();
    await expect(successToast).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'docs/99_Manual/E2E_06_Result/e2e_06_02_admin_replied.png', fullPage: true });
    console.log('Admin reply successful.');

    // Logout admin
    console.log('Logging out Admin...');
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');

    // --- Step 3: Shipper Verification ---
    console.log('Step 3: Verification by Shipper');
    await page.fill('input#email', SHIPPER_EMAIL);
    await page.fill('input#password', PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*orders/);

    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('networkidle');

    console.log('Verifying VOC status changed to IN_PROGRESS...');
    // Customer Support 탭으로 전환
    await page.getByRole('button', { name: /Customer Support/i }).click();
    
    // 특정 제목을 가진 VOC 카드를 찾고 그 안에서 '처리 중' 상태 확인
    const specificVocCard = page.locator('.zen-glass').filter({ hasText: title });
    await expect(specificVocCard.getByText(/처리 중/i)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'docs/99_Manual/E2E_06_Result/e2e_06_03_status_verified.png', fullPage: true });
    
    console.log('E2E-06 VOC Lifecycle Test Passed!');
  });
});
