import { test, expect } from '@playwright/test';

const EMAIL = 'shipper@zenith.kr';
const PASSWORD = 'password1234';
const BASE = 'http://localhost:3000';

const MARKER = {
  representative: 'R10검증대표',
  bizNo: '000-00-00000',
  contact: '010-9999-8888',
  email: 'r10verify@zenith.kr',
  address: '서울 강남구 테헤란로 100길 R10호',
};

async function loginAndGoto(page: any, url: string) {
  await page.goto('/ko/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[data-action="login"]');
  await page.waitForURL((u: URL) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.goto(url);
}

test('R10: corporate info persists to real columns and flows to order form', async ({ page }) => {
  await loginAndGoto(page, '/ko/mypage/corporate');
  await page.waitForSelector('input[name="representative"]', { timeout: 30000 });

  const readForm = async () => ({
    representative: await page.inputValue('input[name="representative"]'),
    bizNo: await page.inputValue('input[name="bizNo"]'),
    contact: await page.inputValue('input[name="contact"]'),
    email: await page.inputValue('input[name="email"]'),
    address: await page.inputValue('input[name="address"]'),
  });
  const original = await readForm();
  console.log('ORIGINAL:', JSON.stringify(original));

  await page.fill('input[name="representative"]', MARKER.representative);
  await page.fill('input[name="bizNo"]', MARKER.bizNo);
  await page.fill('input[name="contact"]', MARKER.contact);
  await page.fill('input[name="email"]', MARKER.email);
  await page.fill('input[name="address"]', MARKER.address);
  await page.screenshot({ path: 'tests/e2e/screenshots/r10-corporate-form-filled.png', fullPage: true });

  await page.click('button[type="submit"]:has-text("정보 저장")');
  await page.waitForSelector('[data-sonner-toast]', { timeout: 15000 });
  const saveToast = await page.textContent('[data-sonner-toast]');
  console.log('SAVE_TOAST:', saveToast);
  expect(saveToast).toContain('저장');

  await page.reload();
  await page.waitForSelector('input[name="representative"]', { timeout: 30000 });
  const afterReload = await readForm();
  console.log('AFTER_RELOAD:', JSON.stringify(afterReload));

  expect(afterReload.representative).toBe(MARKER.representative);
  expect(afterReload.bizNo).toBe(MARKER.bizNo);
  expect(afterReload.contact).toBe(MARKER.contact);
  expect(afterReload.email).toBe(MARKER.email);
  expect(afterReload.address).toBe(MARKER.address);
  await page.screenshot({ path: 'tests/e2e/screenshots/r10-corporate-after-reload.png', fullPage: true });

  await page.goto('/ko/orders/new');
  await page.waitForTimeout(3000);
  const orderAddress = await page.inputValue('input[name="shipper_address"]').catch(() => 'N/A');
  console.log('ORDER_SHIPPER_ADDRESS:', orderAddress);
  expect(orderAddress).toBe(MARKER.address);
  const orderDetail = await page.inputValue('input[name="shipper_address_detail"]').catch(() => 'N/A');
  console.log('ORDER_SHIPPER_ADDRESS_DETAIL:', orderDetail);
  await page.screenshot({ path: 'tests/e2e/screenshots/r10-order-shipper-auto-fill.png', fullPage: true });

  await page.goto('/ko/mypage/corporate');
  await page.waitForSelector('input[name="representative"]', { timeout: 30000 });
  await page.fill('input[name="representative"]', original.representative);
  await page.fill('input[name="bizNo"]', original.bizNo);
  await page.fill('input[name="contact"]', original.contact);
  await page.fill('input[name="email"]', original.email);
  await page.fill('input[name="address"]', original.address);
  await page.click('button[type="submit"]:has-text("정보 저장")');
  await page.waitForSelector('[data-sonner-toast]', { timeout: 15000 });
  console.log('RESTORE_TOAST:', await page.textContent('[data-sonner-toast]'));
});
