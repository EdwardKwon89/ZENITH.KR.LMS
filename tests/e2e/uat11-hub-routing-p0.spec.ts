import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
const SCREENSHOT_DIR = 'docs/99_Manual/UAT_11_Result';
const ADMIN = { email: 'admin@zenith.kr', password: 'password1234' };
const SHIPPER = { email: 'shipper@zenith.kr', password: 'password1234' };

test.describe('UAT-11: Hub Routing & P0', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  async function loginAs(page: any, creds: { email: string; password: string }) {
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input#email', creds.email);
    await page.fill('input#password', creds.password);
    await page.click('button:has-text("로그인")');
    await page.waitForURL(function(url: any) { return !url.pathname.includes('/login'); }, { timeout: 30000 });
  }

  async function selectPort(page: any, portCode: string) {
    var selects = page.locator('select');
    var count = await selects.count();
    for (var i = 0; i < count; i++) {
      var opts = await selects.nth(i).locator('option').allTextContents();
      for (var j = 0; j < opts.length; j++) {
        if (opts[j].indexOf('[' + portCode + ']') >= 0) {
          await selects.nth(i).selectOption({ index: j });
          return;
        }
      }
    }
  }

  test('UAT-11-01: Direct route ICN to SIN AIR', async ({ page }) => {
    test.setTimeout(180000);
    await loginAs(page, ADMIN);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SCREENSHOT_DIR + '/11-01-order-form.png', fullPage: true });

    await page.locator('button:has-text("항공")').click();
    await page.waitForTimeout(500);
    await selectPort(page, 'ICN');
    await selectPort(page, 'SIN');

    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    var tbs = page.locator('input[type="text"], input:not([type])');
    var tbc = await tbs.count();
    for (var i = 0; i < tbc; i++) {
      var ph = await tbs.nth(i).getAttribute('placeholder').catch(function() { return ''; });
      if (ph && ph.includes('Full Name')) { await tbs.nth(i).fill('UAT-11-01 Recipient'); break; }
    }

    await page.locator('input[type="number"]').first().fill('50');
    await page.locator('text=품명').first().fill('Test Cargo');
    await page.locator('button:has-text("오더 등록하기")').click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: SCREENSHOT_DIR + '/11-01-order-created.png', fullPage: true });
    console.log('Order URL: ' + page.url());
  });

  test('UAT-11-02: Hub route PVG to LAX via ICN', async ({ page }) => {
    test.setTimeout(180000);
    await loginAs(page, ADMIN);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("항공")').click();
    await page.waitForTimeout(500);
    await selectPort(page, 'PVG');
    await selectPort(page, 'LAX');
    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    var tbs = page.locator('input[type="text"], input:not([type])');
    var tbc = await tbs.count();
    for (var i = 0; i < tbc; i++) {
      var ph = await tbs.nth(i).getAttribute('placeholder').catch(function() { return ''; });
      if (ph && ph.includes('Full Name')) { await tbs.nth(i).fill('UAT-11-02 Recipient'); break; }
    }
    await page.locator('input[type="number"]').first().fill('50');
    await page.locator('text=품명').first().fill('Hub Test Cargo');
    await page.locator('button:has-text("오더 등록하기")').click();
    await page.waitForTimeout(5000);
    console.log('Hub order: ' + page.url());
  });

  test('UAT-11-05: Privacy consent blocking', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/ko/signup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SCREENSHOT_DIR + '/11-05-signup-page.png', fullPage: true });

    var nextBtn = page.locator('button:has-text("다음"), button:has-text("Next")');
    var nextVisible = await nextBtn.isVisible({ timeout: 5000 }).catch(function() { return false; });
    if (!nextVisible) {
      console.log('No next button found');
      await page.screenshot({ path: SCREENSHOT_DIR + '/11-05-no-next.png', fullPage: true });
      return;
    }

    var checkboxes = page.locator('input[type="checkbox"]');
    var cbCount = await checkboxes.count();
    if (cbCount === 0) {
      console.log('No checkboxes found');
      return;
    }
    console.log('Checkbox count: ' + cbCount);

    await nextBtn.click();
    await page.waitForTimeout(1000);
    var errorVisible = await page.locator('text=동의').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
    console.log('Consent error visible (both unchecked): ' + errorVisible);
    await page.screenshot({ path: SCREENSHOT_DIR + '/11-05-consent-blocked.png', fullPage: true });

    if (cbCount >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await nextBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: SCREENSHOT_DIR + '/11-05-both-consent-proceed.png', fullPage: true });
      console.log('Both checked and clicked next');
    }
  });

  test('UAT-11-06: Rate limiting 429', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');

    var rateLimited = false;
    await page.route('**/auth/v1/token*', function(route) {
      route.continue();
    });
    for (var i = 0; i < 15; i++) {
      await page.fill('input#email', 'rapid_' + i + '@zenith.kr');
      await page.fill('input#password', 'wrong_password');
      var respPromise = page.waitForResponse(function(r) { return r.status() === 429; }, { timeout: 10000 });
      var navPromise = page.waitForURL(function(u) { return u.pathname !== '/ko/login'; }, { timeout: 5000 }).catch(function() { return; });
      await page.click('button:has-text("로그인")');
      var got429 = await respPromise.then(function(r) { return true; }).catch(function() { return false; });
      await navPromise;
      if (got429) {
        rateLimited = true;
        console.log('Rate limited at attempt ' + (i + 1));
        await page.screenshot({ path: SCREENSHOT_DIR + '/11-06-rate-limited.png', fullPage: true });
        break;
      }
      await page.goto('/ko/login').catch(function() { return; });
      await page.waitForLoadState('domcontentloaded').catch(function() { return; });
      await page.waitForTimeout(300);
    }
    console.log('Rate limiting: ' + rateLimited);
  });

  test('UAT-11-04/07: Transit tracking and shipper cost view', async ({ page }) => {
    test.setTimeout(180000);
    await loginAs(page, SHIPPER);

    var result = await supabase
      .from('zen_orders')
      .select('id, order_no')
      .order('created_at', { ascending: false })
      .limit(5);

    var orders = result.data;
    if (orders && orders.length > 0) {
      var firstOrder = orders[0];
      console.log('Navigating to order: ' + firstOrder.order_no + ' (' + firstOrder.id + ')');
      await page.goto('/ko/orders/' + firstOrder.id);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: SCREENSHOT_DIR + '/11-04-order-detail.png', fullPage: true });

      var tisaVisible = await page.locator('text=TISA').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
      var trackingVisible = await page.locator('text=Tracking, text=추적').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
      var costVisible = await page.locator('text=운임').first().isVisible({ timeout: 3000 }).catch(function() { return false; });
      console.log('TISA:' + tisaVisible + ' Tracking:' + trackingVisible + ' Cost:' + costVisible);
      await page.screenshot({ path: SCREENSHOT_DIR + '/11-04-shipper-view.png', fullPage: true });
    } else {
      console.log('No orders found');
    }
  });
});
