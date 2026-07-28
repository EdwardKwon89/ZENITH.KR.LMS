import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const AGENCY_EMAIL = 'agency@zenith.kr';
const AGENCY_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'agency_shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

async function loginAndGoto(page: any, email: string, password: string, url: string) {
  await page.goto('/ko/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  await page.waitForURL((u: URL) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
}

test.describe('R-10: /finance/daily-billing 역할별 스크린샷 (Issue #920)', () => {

  test('ADMIN — 전체 인보이스 집계 화면', async ({ page }) => {
    await loginAndGoto(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/ko/finance/daily-billing');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_daily-billing_admin.png'),
      fullPage: true,
    });
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('AGENCY — 매입/매출 듀얼 섹션 화면', async ({ page }) => {
    await loginAndGoto(page, AGENCY_EMAIL, AGENCY_PASSWORD, '/ko/finance/daily-billing');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_daily-billing_agency.png'),
      fullPage: true,
    });
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('SHIPPER — 본인 인보이스 집계 화면', async ({ page }) => {
    await loginAndGoto(page, SHIPPER_EMAIL, SHIPPER_PASSWORD, '/ko/finance/daily-billing');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_daily-billing_shipper.png'),
      fullPage: true,
    });
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
