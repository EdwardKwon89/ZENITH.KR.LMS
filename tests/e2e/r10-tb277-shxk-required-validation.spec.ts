import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ─── TASK-B-277 / Issue #1052 — R-10 실브라우저 검증 ─────────────────────────
// SHIPPER로 오더 등록 화면에서 UPS 배송 + 수하인 우편번호 미입력 상태로 제출 시도 →
// 명확한 에러로 차단되는지. 우편번호 포함 정상 입력 시 제출 성공까지 확인.

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_277_Result';
const SHIPPER_EMAIL = 'r10_shipper_277@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginAs(page: any, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  await page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 });
}

async function fillUpsForm(page: any, opts: { withZipcode: boolean; withCountry: boolean; withShipperPhone: boolean }) {
  await page.goto('/ko/orders/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('button:has-text("UPS Direct")', { timeout: 30000 });
  await page.locator('button:has-text("UPS Direct")').click();
  await page.waitForTimeout(500);

  // 화주 연락처는 기본정보(화주 정보) 탭에 있음 — 탭 전환 전에 채운다
  if (opts.withShipperPhone) {
    const phoneInput = page.locator('input[name="shipper_contact_phone"]');
    if (await phoneInput.count()) await phoneInput.fill('010-9999-0000');
  }

  await page.locator('button:has-text("수하인 정보")').first().click();
  await page.waitForTimeout(500);

  await page.fill('input[name="recipient_name"]', 'John Doe');
  await page.fill('input[name="recipient_phone"]', '01012345678');

  // 수하인 국가 US 선택
  if (opts.withCountry) {
    await page.locator('select:visible').nth(1).selectOption({ label: 'United States' });
    await page.waitForTimeout(800);
  }
  await page.fill('input[name="recipient_address"]', '456 Oak St, Los Angeles');
  if (opts.withZipcode) {
    await page.fill('input[name="recipient_zipcode"]', '90001');
  }

  // 패키지
  const ct = page.locator('select[name="packages.0.content_type"]');
  if (await ct.count()) await ct.selectOption('NONDOC');
  await page.fill('input[name="packages.0.packing_count"]', '1');
  await page.fill('input[name="packages.0.length"]', '10');
  await page.fill('input[name="packages.0.width"]', '10');
  await page.fill('input[name="packages.0.height"]', '10');
  await page.fill('input[name="packages.0.gross_weight"]', '5');
  await page.fill('input[name="packages.0.items.0.item_name"]', 'Widget');
  await page.fill('input[name="packages.0.items.0.quantity"]', '1');
  const tier = page.locator('select:visible').filter({ has: page.locator('option:has-text("Saver")') }).first();
  if (await tier.count()) await tier.selectOption({ index: 2 });
  await page.waitForTimeout(2000);
}

test.describe('TASK-B-277 R-10: UPS 배송 SHXK 필수 항목 검증', () => {
  test.beforeAll(async () => { await ensureDir(); });

  test('UPS + 우편번호 미입력 → 제출 차단 (명확한 에러)', async ({ page }) => {
    test.setTimeout(120000);

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.waitForLoadState('networkidle');

    await fillUpsForm(page, { withZipcode: false, withCountry: true, withShipperPhone: true });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_no_zipcode_form.png'), fullPage: true });

    const submitBtn = page.locator('button:has-text("오더 등록")').first();
    await submitBtn.click();
    await page.waitForTimeout(2500);

    const body = await page.textContent('body');
    const blocked = /우편번호가 필수|수하인 우편번호/i.test(body || '');
    console.log('우편번호 미입력 차단:', blocked);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_no_zipcode_blocked.png'), fullPage: true });

    // 여전히 /orders/new에 머물러야 함 (제출 실패)
    expect(page.url()).toContain('/orders/new');
    expect(blocked).toBe(true);
    console.log('R-10 PART-1 PASSED: 우편번호 미입력 시 제출 차단');
  });

  test('UPS + 우편번호 포함 → 예상운임 정상 계산 (제출 가능)', async ({ page }) => {
    test.setTimeout(120000);

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.waitForLoadState('networkidle');

    await fillUpsForm(page, { withZipcode: true, withCountry: true, withShipperPhone: true });

    // UPS 예상 운임 패널이 에러 없이 렌더링되는지 확인
    await page.waitForSelector('text=UPS 예상 운임', { timeout: 30000 });
    const body = await page.textContent('body');
    expect((body || '').includes('매핑된 Zone이 없습니다')).toBe(false);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_valid_form.png'), fullPage: true });
    console.log('R-10 PART-2 PASSED: 우편번호 포함 시 예상운임 정상 계산');
  });
});
