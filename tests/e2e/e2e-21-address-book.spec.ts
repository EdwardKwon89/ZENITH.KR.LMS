import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_21_Result';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

test.describe('E2E-21: 주소록 관리 시나리오', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // TASK-151 구현 완료 전까지 skip 처리
  test.skip('주소록 신규 등록, 조회, 수정, 기본 배송지 설정 및 삭제 흐름 검증', async ({ page }) => {
    test.setTimeout(120000);

    // Console logs redirect
    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      // 1. Login
      console.log('1. Shipper Login...');
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', SHIPPER_EMAIL);
      await page.fill('input[name="password"]', SHIPPER_PASSWORD);
      await Promise.all([
        page.waitForURL(/.*(dashboard|orders)/, { timeout: 30000 }),
        page.click('button[data-action="login"]')
      ]);
      console.log('Login successful.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_success.png') });

      // 2. Go to Address Book Page
      console.log('2. Navigating to address book page...');
      await page.goto('/ko/address-book');
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_address_book_page.png') });

      // 3. Register New Address
      console.log('3. Registering new address entry...');
      const registerBtn = page.locator('button:has-text("신규 등록"), button[data-action="register"]');
      await expect(registerBtn).toBeVisible();
      await registerBtn.click();

      // Fill in details
      await page.fill('input[name="display_name"]', 'E2E Test Address');
      await page.fill('input[name="recipient_name"]', 'E2E Recipient');
      await page.fill('input[name="recipient_address"]', 'E2E Address Street 100');
      await page.fill('input[name="recipient_address_local"]', 'E2E 현지어 주소 100번지');
      await page.fill('input[name="recipient_phone"]', '010-1111-2222');
      await page.fill('input[name="country_code"]', 'KR');
      await page.selectOption('select[name="display_mode"]', 'BILINGUAL');
      
      const submitBtn = page.locator('button:has-text("저장"), button:has-text("등록")');
      await submitBtn.click();

      // Check success notification and verify list inclusion
      await expect(page.locator('text=주소록 항목이 등록되었습니다.')).toBeVisible({ timeout: 15000 });
      const addressRow = page.locator('tr:has-text("E2E Test Address")');
      await expect(addressRow).toBeVisible();
      console.log('Address entry registered and visible.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_registered_address.png') });

      // 4. Update Address
      console.log('4. Editing the address entry...');
      const editBtn = addressRow.locator('button:has-text("수정"), button:has-text("편집")');
      await editBtn.click();

      await page.fill('input[name="display_name"]', 'E2E Test Address Updated');
      await page.fill('input[name="recipient_name"]', 'E2E Recipient Updated');
      
      const saveBtn = page.locator('button:has-text("저장")');
      await saveBtn.click();

      await expect(page.locator('text=주소록 항목이 수정되었습니다.')).toBeVisible({ timeout: 15000 });
      const updatedRow = page.locator('tr:has-text("E2E Test Address Updated")');
      await expect(updatedRow).toBeVisible();
      console.log('Address entry updated and visible.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_updated_address.png') });

      // 5. Set as Default Address
      console.log('5. Setting address as default...');
      const defaultCheckbox = updatedRow.locator('input[type="checkbox"], button:has-text("기본 배송지 설정")');
      await defaultCheckbox.click();
      
      await expect(page.locator('text=기본 배송지가 변경되었습니다.')).toBeVisible({ timeout: 15000 });
      await expect(updatedRow.locator('span:has-text("기본")')).toBeVisible();
      console.log('Successfully set as default address.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_default_address_set.png') });

      // 6. Delete Address
      console.log('6. Deleting the address entry...');
      const deleteBtn = updatedRow.locator('button:has-text("삭제")');
      await deleteBtn.click();

      // Confirm deletion if modal/confirm appears
      const confirmBtn = page.locator('button:has-text("확인"), button:has-text("예")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      await expect(page.locator('text=삭제되었습니다.')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('tr:has-text("E2E Test Address Updated")')).not.toBeVisible();
      console.log('Address entry successfully deleted.');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_deleted_address.png') });

    } catch (err) {
      console.error('Test failed! Capturing failure_diagnostic.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_diagnostic.png') });
      throw err;
    }
  });
});
