import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_13_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const TARGET_ORDER_NO = 'Z-FIN-E2E05-01'; // 검증용 표준 오더 번호

test.describe('E2E-13: HELD 상태 원상복구 시나리오', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('HELD 상태로 전환 후 이전 상태(WAREHOUSED)로 원상복구 흐름 검증', async ({ page }) => {
    test.setTimeout(120000);

    // Console logs redirect
    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      // 1. Login
      console.log('1. Admin Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_success.png') });

      // 2. Go to Orders List and Search Target Order
      console.log('2. Navigating to orders list and searching...');
      await page.goto('/ko/orders');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page.locator('input[placeholder*="Order No"]');
      await searchInput.fill(TARGET_ORDER_NO);
      await page.keyboard.press('Enter');

      const targetRow = page.locator(`tr:has-text("${TARGET_ORDER_NO}")`);
      await expect(targetRow).toBeVisible({ timeout: 15000 });
      console.log('Target order row is visible.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_search_order.png') });

      // 3. PENDING 상태 확인 및 모달 오픈 -> WAREHOUSED 상태로 전환
      console.log('3. Changing status to WAREHOUSED...');
      
      const statusBadge = targetRow.locator('span.cursor-pointer');
      await expect(statusBadge).toBeVisible();
      await statusBadge.click();

      // 모달이 열리는지 확인
      const modalTitle = page.locator('h3:has-text("상태 변경")');
      await expect(modalTitle).toBeVisible({ timeout: 10000 });

      // WAREHOUSED 상태 선택 버튼 클릭
      const warehousedBtn = page.locator('button:has-text("입고완료"), button:has-text("WAREHOUSED")');
      await expect(warehousedBtn).toBeVisible();
      await warehousedBtn.click();

      // 사유 입력
      const reasonTextarea = page.locator('textarea[placeholder*="상태 변경 사유"]');
      await reasonTextarea.fill('E2E Test: PENDING to WAREHOUSED');

      // 상태 업데이트 실행
      const submitBtn = page.locator('button:has-text("상태 업데이트")');
      await submitBtn.click();

      // toast 성공 메시지 확인
      await expect(page.locator('text=상태가 성공적으로 업데이트되었습니다.')).toBeVisible({ timeout: 15000 });
      console.log('Successfully changed status to WAREHOUSED.');
      await expect(targetRow.locator('span:has-text("입고완료")')).toBeVisible({timeout:10000});
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_changed_to_warehoused.png') });

      // WAREHOUSED 배지 확인
      await expect(targetRow.locator('span:has-text("입고완료"), span:has-text("WAREHOUSED")')).toBeVisible();

      // 4. 다시 모달 오픈 -> HELD 상태로 전환
      console.log('4. Changing status to HELD...');
      const warehousedBadge = targetRow.locator('span:has-text("입고완료"), span:has-text("WAREHOUSED")');
      await warehousedBadge.click();
      await expect(modalTitle).toBeVisible({ timeout: 10000 });

      const heldBtn = page.locator('button:has-text("보류"), button:has-text("HELD")');
      await expect(heldBtn).toBeVisible();
      await heldBtn.click();

      await reasonTextarea.fill('E2E Test: WAREHOUSED to HELD');
      await submitBtn.click();

      await expect(page.locator('text=상태가 성공적으로 업데이트되었습니다.')).toBeVisible({ timeout: 15000 });
      console.log('Successfully changed status to HELD.');
      await expect(targetRow.locator('span:has-text("보류")')).toBeVisible({timeout:10000});
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_changed_to_held.png') });

      // HELD 배지 확인
      await expect(targetRow.locator('span:has-text("보류"), span:has-text("HELD")')).toBeVisible();

      // 5. 다시 모달 오픈 -> 원상복구 버튼 확인 및 클릭
      console.log('5. Opening modal on HELD status...');
      const heldBadge = targetRow.locator('span:has-text("보류"), span:has-text("HELD")');
      await heldBadge.click();
      await expect(modalTitle).toBeVisible({ timeout: 10000 });

      // 원상복구 버튼 및 이전 상태 레이블(WAREHOUSED / 입고완료) 확인
      const prevStatusText = page.locator('span:has-text("이전 상태: 입고완료"), span:has-text("이전 상태: WAREHOUSED")');
      await expect(prevStatusText).toBeVisible({ timeout: 10000 });
      console.log('Previous status WAREHOUSED is displayed correctly.');

      const restoreBtn = page.locator('button:has-text("원상복구")');
      await expect(restoreBtn).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_held_modal_restore_button.png') });

      // 원상복구 클릭
      console.log('Clicking restore button...');
      await restoreBtn.click();

      // toast "이전 상태로 성공적으로 복구되었습니다." 확인
      await expect(page.locator('text=이전 상태로 성공적으로 복구되었습니다.')).toBeVisible({ timeout: 15000 });
      console.log('Restore success toast verified.');
      await expect(targetRow.locator('span:has-text("입고완료")')).toBeVisible({timeout:10000});
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_restored_to_warehoused.png') });

      // 배지가 원래 상태(WAREHOUSED / 입고완료)로 복귀했는지 확인
      await expect(targetRow.locator('span:has-text("입고완료"), span:has-text("WAREHOUSED")')).toBeVisible();
      console.log('Order status successfully reverted to WAREHOUSED.');
    } catch (err) {
      console.error('Test failed! Capturing failure_diagnostic.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_diagnostic.png') });
      throw err;
    }
  });
});
