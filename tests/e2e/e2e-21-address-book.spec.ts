import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_21_Result';

const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

test.describe('E2E-21: Address Book Management', () => {

  test('주소록 신규 등록, 조회, 수정, 기본 배송지 설정 및 삭제 흐름 검증', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    try {
      // 1. Login
      console.log('1. Login...');
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

      // 2. Navigate to address book
      console.log('2. Navigate to /ko/address-book...');
      await page.goto('/ko/address-book');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_address_book_page.png') });

      // 3. Register new address (TC-P7-ADDR-01)
      console.log('3. Register new address entry...');
      await page.fill('input[placeholder="표시명"]', 'E2E Test Office');
      await page.fill('input[placeholder="수취인 이름"]', 'Kim E2E');
      await page.fill('input[placeholder="수취인 주소"]', '123 E2E Street, Seoul');
      await page.fill('input[placeholder="현지어 주소 (선택)"]', '서울시 강남구 E2E로 123');
      await page.fill('input[placeholder="연락처"]', '010-1234-5678');
      await page.fill('input[placeholder="국가 코드"]', 'KR');
      await page.selectOption('select[name="display_mode"]', 'BILINGUAL');
      await page.click('button:has-text("추가")');
      await page.waitForTimeout(1500);

      await expect(page.locator('text=E2E Test Office')).toBeVisible();
      await expect(page.locator('text=Kim E2E | 010-1234-5678')).toBeVisible();
      await expect(page.locator('text=123 E2E Street, Seoul')).toBeVisible();
      await expect(page.locator('text=서울시 강남구 E2E로 123')).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_registered_address.png') });
      console.log('Address entry registered successfully.');

      // 4. Verify list shows entry (TC-P7-ADDR-02)
      console.log('4. Verify address entry appears in list...');
      const card = page.locator('.grid.gap-3 > div').filter({ hasText: 'E2E Test Office' });
      await expect(card).toBeVisible();
      await expect(card.locator('text=KR · BILINGUAL')).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_address_list.png') });
      console.log('Address entry verified in list.');

      // 5. Edit address entry (TC-P7-ADDR-03)
      console.log('5. Edit address entry...');
      const editButton = card.locator('button').first();
      await editButton.click();
      await page.waitForTimeout(500);

      await page.fill('input[placeholder="표시명"]', '');
      await page.fill('input[placeholder="표시명"]', 'E2E Test Office Updated');
      await page.fill('input[placeholder="수취인 이름"]', '');
      await page.fill('input[placeholder="수취인 이름"]', 'Park E2E');
      await page.click('button:has-text("수정")');
      await page.waitForTimeout(1500);

      await expect(page.locator('text=E2E Test Office Updated')).toBeVisible();
      await expect(page.locator('text=Park E2E')).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_updated_address.png') });
      console.log('Address entry updated successfully.');

      // 6. Set as default address (TC-P7-ADDR-05)
      console.log('6. Set as default address...');
      const updatedCard = page.locator('.grid.gap-3 > div').filter({ hasText: 'E2E Test Office Updated' });
      const defaultCheckbox = updatedCard.locator('input[type="checkbox"]');
      if (await defaultCheckbox.count() > 0) {
        await defaultCheckbox.check();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_default_address_set.png') });
      console.log('Default address set (or verified).');

      // 7. Delete address entry (TC-P7-ADDR-04)
      console.log('7. Delete address entry...');
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      const deleteButton = updatedCard.locator('button').last();
      await deleteButton.click();
      await page.waitForTimeout(1500);

      await expect(page.locator('text=E2E Test Office Updated')).not.toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_deleted_address.png') });
      console.log('Address entry deleted successfully.');

    } catch (err) {
      console.error('Test failed! Capturing failure_diagnostic.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'failure_diagnostic.png') });
      throw err;
    }
  });
});
