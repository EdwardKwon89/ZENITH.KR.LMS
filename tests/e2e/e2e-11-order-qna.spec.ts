import { test, expect } from '@playwright/test';
import fs from 'fs';

// Test Data
const SHIPPER_EMAIL = 'test_corp_1777785263838@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';
const ADMIN_EMAIL = 'admin_e2e@zenith.kr';
const ADMIN_PASSWORD = 'password1234!';
const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_11_Result';

test.describe('E2E-11: Order QnA Workflow', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Complete QnA Lifecycle: Submission -> Admin Response -> Verification', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    const QNA_TITLE = `Order Inquiry ${Date.now()}`;
    const QNA_CONTENT = 'This is a test inquiry about the delivery status.';
    const ADMIN_ANSWER = 'Your order is currently being processed. Expected delivery in 2 days.';

    // --- Step 1: Shipper QnA Submission ---
    console.log('Step 1: Shipper Login & QnA Submission');
    await page.goto('/ko/login');
    await page.fill('input[type="email"]', SHIPPER_EMAIL);
    await page.fill('input[type="password"]', SHIPPER_PASSWORD);
    await page.click('button:has-text("로그인")');
    await expect(page).toHaveURL(/\/dashboard|orders/, { timeout: 15000 });

    // Navigate to New QnA page with Order context
    await page.goto(`/ko/support/qna/new?orderId=${TEST_ORDER_ID}`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder="1:1 문의"]', QNA_TITLE);
    await page.fill('textarea[placeholder="내용"]', QNA_CONTENT);
    
    // Submit
    await page.click('button:has-text("제출")');
    
    // Verify redirect to QnA list
    await expect(page).toHaveURL(/\/support\/qna/, { timeout: 15000 });
    await expect(page.locator(`text=${QNA_TITLE}`)).toBeVisible();
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_11_01_qna_submitted.png` });
    console.log('✅ Step 1: QnA Submitted');

    // Logout Shipper
    await page.hover('header .group');
    await page.click('button:has-text("로그아웃")');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // --- Step 2: Admin QnA List Check ---
    console.log('Step 2: Admin Login & QnA List Check');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("로그인")');
    await expect(page).toHaveURL(/\/orders/, { timeout: 15000 });

    await page.goto('/ko/support/qna');
    await page.waitForLoadState('networkidle');
    
    // Check if QnA appears in Admin VOC list
    const qnaEntry = page.locator(`text=${QNA_TITLE}`);
    await expect(qnaEntry).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_11_02_admin_qna_list.png` });
    console.log('✅ Step 2: QnA visible in Admin Support List');

    // --- Step 3: Admin Answer Submission ---
    console.log('Step 3: Admin Answer Submission');
    await qnaEntry.click();
    await page.waitForSelector('textarea[placeholder="답변 내용을 입력하세요..."]');
    
    await page.fill('textarea[placeholder="답변 내용을 입력하세요..."]', ADMIN_ANSWER);
    await page.click('button:has-text("답변 확정")');
    
    // Verify answer appears in the list
    await expect(page.locator(`text=${ADMIN_ANSWER}`)).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_11_03_admin_answer_submitted.png` });
    console.log('✅ Step 3: Admin Answer Submitted');

    // Logout Admin
    await page.hover('header .group');
    await page.click('button:has-text("로그아웃")');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // --- Step 4: Shipper Verification ---
    console.log('Step 4: Shipper Verification of Answer');
    await page.fill('input[type="email"]', SHIPPER_EMAIL);
    await page.fill('input[type="password"]', SHIPPER_PASSWORD);
    await page.click('button:has-text("로그인")');
    await expect(page).toHaveURL(/\/orders/, { timeout: 15000 });
    
    await page.goto('/ko/support/qna');
    await page.waitForLoadState('networkidle');
    
    const myQna = page.locator(`text=${QNA_TITLE}`);
    await myQna.click();
    
    // Verify Admin answer is visible on details page
    await expect(page.locator(`text=${ADMIN_ANSWER}`)).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_11_04_shipper_answer_visible.png` });
    console.log('✅ Step 4: Shipper verified answer');
  });
});
