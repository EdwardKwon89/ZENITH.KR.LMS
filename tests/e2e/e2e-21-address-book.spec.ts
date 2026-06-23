import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_21_Result';
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

const ADDR = {
  display_name: 'E2E Test Address',
  recipient_name: 'E2E Recipient',
  recipient_address: 'E2E Address Street 100',
  recipient_address_local: 'E2E 현지어 주소 100번지',
  recipient_phone: '010-1111-2222',
  country_code: 'KR',
};

test.describe('E2E-21: 주소록 관리 시나리오', () => {
  let supabase: any;

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    supabase = createClient(SUPABASE_URL, key);

    const { data: existing } = await supabase
      .from('zen_profiles')
      .select('id')
      .eq('email', SHIPPER_EMAIL)
      .maybeSingle();

    if (!existing) {
      const { data: signUp } = await supabase.auth.admin.createUser({
        email: SHIPPER_EMAIL,
        password: SHIPPER_PASSWORD,
        email_confirm: true,
      });
      if (signUp?.user) {
        await supabase.from('zen_profiles').upsert({
          id: signUp.user.id,
          email: SHIPPER_EMAIL,
          full_name: 'E2E21 Test Shipper',
          role: 'CORPORATE',
          status: 'ACTIVE',
          grade_code: 'IRON',
        });
      }
    }
  });

  test('주소록 신규 등록, 조회, 수정, 기본 배송지 설정 및 삭제 흐름 검증', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

    // 1. Login
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[name="email"]', SHIPPER_EMAIL);
    await page.fill('input[name="password"]', SHIPPER_PASSWORD);
    await page.click('button[data-action="login"]');
    await expect(page).toHaveURL(/\/orders|admin|dashboard/, { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_success.png') });

    // 2. Navigate to Address Book
    await page.goto('/ko/address-book');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_address_book_page.png') });

    // 3. Register new address
    await page.fill('input[placeholder="표시명"]', ADDR.display_name);
    await page.fill('input[placeholder="수취인 이름"]', ADDR.recipient_name);
    await page.fill('input[placeholder="수취인 주소"]', ADDR.recipient_address);
    await page.fill('input[placeholder="현지어 주소 (선택)"]', ADDR.recipient_address_local);
    await page.fill('input[placeholder="연락처"]', ADDR.recipient_phone);
    await page.fill('input[placeholder="국가 코드"]', ADDR.country_code);
    await page.selectOption('select', 'BILINGUAL');
    await page.click('button:has-text("추가")');
    await expect(page.locator(`text=${ADDR.display_name}`)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_registered_address.png') });

    // 4. Edit address
    let entryCard = page.locator('.zen-glass', { hasText: ADDR.display_name });
    await entryCard.locator('button').first().click();
    await page.fill('input[placeholder="표시명"]', `${ADDR.display_name} Updated`);
    await page.fill('input[placeholder="수취인 이름"]', `${ADDR.recipient_name} Updated`);
    await page.click('button:has-text("수정")');
    await expect(page.locator(`text=${ADDR.display_name} Updated`)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_updated_address.png') });

    // 5. Toggle default address
    entryCard = page.locator('.zen-glass', { hasText: `${ADDR.display_name} Updated` });
    await entryCard.locator('button').first().click();
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("수정")');
    await expect(page.locator('.text-yellow-500')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_default_address_set.png') });

    // 6. Delete address
    page.on('dialog', async dialog => { await dialog.accept(); });
    entryCard = page.locator('.zen-glass', { hasText: `${ADDR.display_name} Updated` });
    await entryCard.locator('button').last().click();
    await expect(page.locator(`text=${ADDR.display_name} Updated`)).not.toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_deleted_address.png') });
  });
});
