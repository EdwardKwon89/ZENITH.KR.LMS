/**
 * TASK-1166 / DEF-153 (Issue #1386) — R-10 UI 증적 캡처
 *
 * 전제: 로컬 Supabase(127.0.0.1:54321) + `npm run dev`(localhost:3000) 실행 중
 * 실행: node scripts/task1166-r10-screenshot.js
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const PASSWORD = 'password1234';
const OUT_DIR = path.join(__dirname, '..', 'docs', '99_Manual', 'E2E_1166_Result');
const ORDER_ID = '4673d00f-0d5b-4339-91c6-d75b6b75c69f'; // shipper@zenith.kr 소속 UPS 오더

const ACCOUNTS = {
  shipper: 'shipper@zenith.kr',
  admin: 'admin@zenith.kr',
  carrier: 'carrier@zenith.kr',
};

async function login(browser, email, locale = 'ko') {
  const ctx = await browser.newContext({ locale, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${locale}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(4000);
  return { ctx, page };
}

async function capture(page, name, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3500);
  const bodyText = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true });
  console.log(`[saved] ${name} :: ${url} :: text=${bodyText.length}`);
  return bodyText;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = {};

  try {
    // 1) 화주 — 오더 등록 폼(운송 옵션) / 오더 상세(경로 최적화)
    {
      const { ctx, page } = await login(browser, ACCOUNTS.shipper);
      report.shipper_orders_new = await capture(page, '01_shipper_orders_new.png', '/ko/orders/new');
      report.shipper_order_detail = await capture(page, '02_shipper_order_detail_route.png', `/ko/orders/${ORDER_ID}`);
      report.shipper_ups_detail = await capture(page, '03_shipper_ups_detail_snapshot.png', `/ko/orders/${ORDER_ID}/ups-detail`);
      await ctx.close();
    }

    // 2) 관리자 — 요율 화면 + 오류 로그
    {
      const { ctx, page } = await login(browser, ACCOUNTS.admin);
      report.admin_rates = await capture(page, '04_admin_rates.png', '/ko/admin/rates');
      report.admin_rate_cards = await capture(page, '05_admin_rate_cards.png', '/ko/admin/rate-cards');
      report.admin_ups_detail = await capture(page, '06_admin_ups_detail_snapshot.png', `/ko/orders/${ORDER_ID}/ups-detail`);
      report.admin_error_logs = await capture(page, '07_admin_error_logs.png', '/ko/admin/error-logs');
      await ctx.close();
    }

    // 3) 운송사 — 요율 화면(자기 운송사 행만)
    {
      const { ctx, page } = await login(browser, ACCOUNTS.carrier);
      report.carrier_rates = await capture(page, '08_carrier_rates.png', '/ko/admin/rates');
      await ctx.close();
    }
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  const summaryPath = path.join(OUT_DIR, 'summary.txt');
  const lines = Object.entries(report).map(
    ([key, text]) =>
      `${key}\tlength=${text.length}\tcarrier_cost=${text.includes('carrier_cost')}\tmargin=${text.includes('마진')}`
  );
  fs.writeFileSync(summaryPath, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  console.log('done');
})();
