import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_21_Result';
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

const ORG_USER_EMAIL = 'agency_shipper_org@e2e.zenith.kr';
const ORG_USER_PASSWORD = 'password1234';

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

  test.describe('org_id 기반 계정 시나리오', () => {
    let orgSupabase: any;
    let agencyOrgId: string;
    let shipperOrgId: string;

    test.beforeAll(async () => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
      orgSupabase = createClient(SUPABASE_URL, key);

      const emailClean = ORG_USER_EMAIL.replace(/[^a-zA-Z0-9@]/g, '');

      // Clean up any leftover from previous runs
      const { data: existing } = await orgSupabase.from('zen_profiles').select('id').eq('email', ORG_USER_EMAIL).maybeSingle();
      if (existing) {
        await orgSupabase.auth.admin.deleteUser(existing.id);
        await orgSupabase.from('zen_profiles').delete().eq('email', ORG_USER_EMAIL);
      }

      // Create agency org
      const { data: agencyOrg } = await orgSupabase.from('zen_organizations').insert({
        name: `E2E Agency ${Date.now()}`,
        type: 'AGENCY',
        status: 'ACTIVE',
      }).select('id').single();
      agencyOrgId = agencyOrg.id;

      // Create shipper org
      const { data: shipperOrg } = await orgSupabase.from('zen_organizations').insert({
        name: `E2E Shipper ${Date.now()}`,
        type: 'SHIPPER',
        status: 'ACTIVE',
      }).select('id').single();
      shipperOrgId = shipperOrg.id;

      // Create link
      await orgSupabase.from('zen_agency_shippers').insert({
        agency_org_id: agencyOrgId,
        shipper_org_id: shipperOrgId,
        shipper_type: 'CORPORATE',
        discount_rate: 0,
      });

      // Create auth user with org_id
      const { data: authData } = await orgSupabase.auth.admin.createUser({
        email: ORG_USER_EMAIL,
        password: ORG_USER_PASSWORD,
        email_confirm: true,
      });
      if (authData?.user) {
        await orgSupabase.from('zen_profiles').upsert({
          id: authData.user.id,
          email: ORG_USER_EMAIL,
          full_name: 'E2E21 Org Test User',
          role: 'AGENCY_SHIPPER',
          org_id: shipperOrgId,
          org_type: 'SHIPPER',
          status: 'ACTIVE',
          grade_code: 'IRON',
        });
        await orgSupabase.auth.admin.updateUserById(authData.user.id, {
          app_metadata: {
            role: 'AGENCY_SHIPPER',
            org_id: shipperOrgId,
            org_type: 'SHIPPER',
            status: 'ACTIVE',
          },
        });
      }
    });

    test('org_id 기반 계정 주소록 등록 및 조회', async ({ page }) => {
      test.setTimeout(120000);

      page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

      // Login as org-based user
      await page.goto('/ko/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input[name="email"]', ORG_USER_EMAIL);
      await page.fill('input[name="password"]', ORG_USER_PASSWORD);
      await page.click('button[data-action="login"]');
      await expect(page).toHaveURL(/\/orders|admin|dashboard/, { timeout: 30000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_org_login_success.png') });

      // Navigate to address book
      await page.goto('/ko/address-book');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_org_address_book_page.png') });

      // Register new address (org_id path — tests zen_address_book_org_member_access policy)
      const orgAddr = `${ADDR.display_name} Org`;
      await page.fill('input[placeholder="표시명"]', orgAddr);
      await page.fill('input[placeholder="수취인 이름"]', ADDR.recipient_name);
      await page.fill('input[placeholder="수취인 주소"]', ADDR.recipient_address);
      await page.fill('input[placeholder="연락처"]', ADDR.recipient_phone);
      await page.fill('input[placeholder="국가 코드"]', ADDR.country_code);
      await page.selectOption('select', 'BILINGUAL');
      await page.click('button:has-text("추가")');
      await expect(page.locator(`text=${orgAddr}`)).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_org_registered_address.png') });

      // Edit address
      let entryCard = page.locator('.zen-glass', { hasText: orgAddr });
      await entryCard.locator('button').first().click();
      await page.fill('input[placeholder="표시명"]', `${orgAddr} Updated`);
      await page.click('button:has-text("수정")');
      await expect(page.locator(`text=${orgAddr} Updated`)).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_org_updated_address.png') });

      // Delete address
      page.on('dialog', async dialog => { await dialog.accept(); });
      entryCard = page.locator('.zen-glass', { hasText: `${orgAddr} Updated` });
      await entryCard.locator('button').last().click();
      await expect(page.locator(`text=${orgAddr} Updated`)).not.toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_org_deleted_address.png') });
    });
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
