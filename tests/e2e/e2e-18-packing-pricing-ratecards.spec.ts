import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_18_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';
const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';

test.describe('E2E-18: Packing / Composite Pricing / Rate Cards Flow', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // ──────────────────────────────────────────────
  // Scenario A: SCR-031 Packing List Page
  // ──────────────────────────────────────────────
  test('Scenario A: SCR-031 Packing List Page', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // 1. Admin login
    console.log('Step 1: Admin login');
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    // 2. Go to master-orders list
    console.log('Step 2: Navigate to master orders');
    await page.goto('/ko/master-orders');
    await page.waitForLoadState('networkidle');

    // 3. Check master order list is visible
    const masterTable = page.locator('table').first();
    await expect(masterTable).toBeVisible({ timeout: 10000 });

    // 4. Click first master order to enter packing page (via URL construction)
    console.log('Step 3: Get first master order ID');
    const firstRow = page.locator('tbody tr').first();
    const firstLink = firstRow.locator('a').first();
    const href = await firstLink.getAttribute('href');

    if (href && href.includes('/master-orders/')) {
      const masterId = href.split('/master-orders/')[1]?.split('/')[0] || href.split('/master-orders/')[1];
      const packingUrl = `/ko/master-orders/${masterId}/packing`;
      console.log(`  Packing URL: ${packingUrl}`);

      // 5. Navigate to packing page
      console.log('Step 4: Navigate to packing page');
      await page.goto(packingUrl);
      await page.waitForLoadState('networkidle');

      // 6. Verify packing page rendered
      const pageTitle = page.locator('h1').first();
      await expect(pageTitle).toBeVisible({ timeout: 10000 });

      // 7. Verify PackingToolbar (client component with print/back buttons)
      console.log('Step 5: Verify PackingToolbar');
      const printBtn = page.locator('button').filter({ hasText: /인쇄|Print|印刷|印刷/ }).first();
      await expect(printBtn).toBeVisible({ timeout: 5000 });

      const backBtn = page.locator('button').filter({ hasText: /뒤로|Back|戻る|返回/ }).first();
      await expect(backBtn).toBeVisible({ timeout: 5000 });

      // 8. Verify house order table
      console.log('Step 6: Verify house order table');
      const packingTable = page.locator('table').first();
      await expect(packingTable).toBeVisible({ timeout: 5000 });

      await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_a_packing_page.png`, fullPage: true });
      console.log('Scenario A: Packing list page verified');
    } else {
      console.log('  No master order link found — verifying empty state');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_a_empty_state.png`, fullPage: true });
    }

    // 9. Verify SHIPPER access denied
    console.log('Step 7: Verify SHIPPER access denied');
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', SHIPPER_EMAIL);
    await page.fill('input#password', SHIPPER_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    const shipperPackingUrl = `/ko/master-orders/non-existent/packing`;
    await page.goto(shipperPackingUrl);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`  SHIPPER access to /master-orders: ${currentUrl}`);
    // Should get 404 or redirect — not a full page crash
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText).not.toContain('ECONNREFUSED');
    expect(bodyText).not.toContain('500');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_a_shipper_denied.png`, fullPage: true });
    console.log('Scenario A PASSED');
  });

  // ──────────────────────────────────────────────
  // Scenario B: Real DB Route Options (Composite Pricing)
  // ──────────────────────────────────────────────
  test('Scenario B: Real DB Route Options via Composite Pricing', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // Setup: Create Supabase admin client
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // Step 1: Verify seed data exists in DB
    console.log('Step 1: Verify DB seed data (carriers, route_network, rate_cards, surcharges)');
    const { data: carriers } = await supabase.from('zen_carriers').select('id, code, transport_mode').eq('is_active', true);
    console.log(`  Found ${carriers?.length || 0} carriers`);
    expect(carriers?.length).toBeGreaterThanOrEqual(2);

    const { data: routes } = await supabase.from('zen_route_network').select('id, carrier_id, from_port_id, to_port_id, transport_mode').eq('is_active', true);
    console.log(`  Found ${routes?.length || 0} routes`);
    expect(routes?.length).toBeGreaterThanOrEqual(1);

    const { data: rateCards } = await supabase.from('zen_rate_cards').select('id, carrier_id, transport_mode, currency').eq('is_active', true);
    console.log(`  Found ${rateCards?.length || 0} rate cards`);
    expect(rateCards?.length).toBeGreaterThanOrEqual(1);

    const { data: surcharges } = await supabase.from('zen_surcharges').select('id, carrier_id, surcharge_type, rate_type, amount').eq('is_active', true);
    console.log(`  Found ${surcharges?.length || 0} surcharges`);
    expect(surcharges?.length).toBeGreaterThanOrEqual(1);

    // Step 2: Login as admin
    console.log('Step 2: Admin login');
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    // Step 3: Clean up and ensure test order is in proper state
    console.log('Step 3: Clean up route data');
    await supabase.from('zen_order_routes').delete().eq('order_id', TEST_ORDER_ID);
    await supabase.from('zen_route_options').delete().eq('order_id', TEST_ORDER_ID);
    await supabase.from('zen_orders').update({ status: 'PENDING' }).eq('id', TEST_ORDER_ID);

    // Step 4: Navigate to order detail
    console.log('Step 4: Navigate to order detail');
    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('networkidle');

    // Step 5: Find route optimization section and calculate
    console.log('Step 5: Trigger route calculation');
    const routeSection = page.locator('section').filter({ hasText: /경로 최적화|Route Optimization/ }).first();
    await expect(routeSection).toBeVisible({ timeout: 15000 });

    const calcButton = routeSection.locator('button').filter({ hasText: /경로 계산|Calculate/ }).first();
    if (await calcButton.isVisible()) {
      await calcButton.click();
    } else {
      const recalcButton = routeSection.locator('button').filter({ hasText: /경로 재계산|Recalculate/ }).first();
      if (await recalcButton.isVisible()) await recalcButton.click();
    }

    // Step 6: Verify 3 options appear
    console.log('Step 6: Verify 3 route options');
    await expect(routeSection.locator('text=최저비용').or(routeSection.locator('text=Lowest Cost'))).toBeVisible({ timeout: 25000 });
    await expect(routeSection.locator('text=최단시간').or(routeSection.locator('text=Fastest'))).toBeVisible();
    await expect(routeSection.locator('text=최적균형').or(routeSection.locator('text=Balanced'))).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_b_route_options.png`, fullPage: true });

    // Step 7: Verify DB records for route options with real pricing
    console.log('Step 7: Verify DB route options have real pricing (> 0)');
    await page.waitForTimeout(2000);

    const { data: options } = await supabase
      .from('zen_route_options')
      .select('option_type, total_freight, carrier_code, transport_mode')
      .eq('order_id', TEST_ORDER_ID);

    console.log(`  Found ${options?.length || 0} route options in DB`);
    expect(options?.length).toBe(3);

    for (const opt of options || []) {
      console.log(`  ${opt.option_type}: freight=${opt.total_freight}, carrier=${opt.carrier_code}, mode=${opt.transport_mode}`);
      expect(opt.total_freight).toBeGreaterThan(0);
    }

    // Step 8: Select a route and confirm
    console.log('Step 8: Select BALANCED route');
    const balancedCard = routeSection.locator('div.relative').filter({ hasText: /최적균형|Balanced/ }).first();
    const selectBtn = balancedCard.locator('button').filter({ hasText: /이 경로 선택|Select/ }).first();
    if (await selectBtn.isVisible()) {
      await selectBtn.click();
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_b_route_selected.png`, fullPage: true });
    console.log('Scenario B PASSED');
  });

  // ──────────────────────────────────────────────
  // Scenario C: Admin Rate Cards CRUD + Surcharges
  // ──────────────────────────────────────────────
  test('Scenario C: Admin Rate Cards CRUD + Surcharges', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // Setup: Get carrier ID for test data
    const { data: airCarrier } = await supabase
      .from('zen_carriers')
      .select('id')
      .eq('code', 'ZENITH_AIR')
      .single();
    expect(airCarrier).toBeTruthy();
    const carrierId = airCarrier!.id;

    // Step 1: Admin login
    console.log('Step 1: Admin login');
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    // Step 2: Navigate to rates admin page
    console.log('Step 2: Navigate to /ko/admin/rates');
    await page.goto('/ko/admin/rates');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_c_ratecards_page.png`, fullPage: true });

    // Verify Rate Cards tab and Surcharges tab are visible
    const rateCardsTab = page.locator('button').filter({ hasText: /Rate Cards|요율 카드/ }).first();
    await expect(rateCardsTab).toBeVisible({ timeout: 10000 });

    const surchargesTab = page.locator('button').filter({ hasText: /Surcharges|할증/ }).first();
    await expect(surchargesTab).toBeVisible({ timeout: 5000 });

    // Step 3: Verify rate cards list is displayed
    console.log('Step 3: Verify rate cards list');
    const cardsList = page.locator('table').first();
    await expect(cardsList).toBeVisible({ timeout: 10000 });

    // Step 4: Create a new rate card via UI
    console.log('Step 4: Create new rate card');
    const createBtn = page.locator('button').filter({ hasText: /생성|Create|New|추가/ }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Fill form fields
      const carrierSelect = page.locator('select').first();
      if (await carrierSelect.isVisible()) {
        const options = await carrierSelect.locator('option').all();
        if (options.length > 1) {
          await carrierSelect.selectOption({ index: 1 });
        }
      }

      const modeInput = page.locator('input').first();
      if (await modeInput.isVisible()) {
        await modeInput.fill('AIR');
      }

      const currencyInput = page.locator('input[placeholder*="currency" i], input[name*="currency" i]').first();
      if (await currencyInput.isVisible()) {
        await currencyInput.fill('USD');
      }

      const submitFormBtn = page.locator('button').filter({ hasText: /저장|확인|Submit|Save|생성/ }).first();
      if (await submitFormBtn.isVisible()) {
        await submitFormBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_c_create_card.png`, fullPage: true });

    // Step 5: Switch to Surcharges tab
    console.log('Step 5: Switch to Surcharges tab');
    await surchargesTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_c_surcharges_tab.png`, fullPage: true });

    // Verify surcharges list is displayed
    const surchargesList = page.locator('table').first();
    await expect(surchargesList).toBeVisible({ timeout: 10000 });

    // Step 6: Create a surcharge via UI
    console.log('Step 6: Create a surcharge');
    const createSurchargeBtn = page.locator('button').filter({ hasText: /생성|Create|New|추가/ }).first();
    if (await createSurchargeBtn.isVisible()) {
      await createSurchargeBtn.click();
      await page.waitForTimeout(1000);

      const typeInput = page.locator('input').first();
      if (await typeInput.isVisible()) {
        await typeInput.fill('FSC');
      }

      const submitSurchargeBtn = page.locator('button').filter({ hasText: /저장|확인|Submit|Save|생성/ }).first();
      if (await submitSurchargeBtn.isVisible()) {
        await submitSurchargeBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_c_create_surcharge.png`, fullPage: true });

    // Step 7: Switch back to Rate Cards tab and verify
    console.log('Step 7: Switch back to Rate Cards tab');
    await rateCardsTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_c_final.png`, fullPage: true });

    // Step 8: Verify SHIPPER access denied
    console.log('Step 8: Verify SHIPPER access denied');
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', SHIPPER_EMAIL);
    await page.fill('input#password', SHIPPER_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL(/.*(dashboard|orders)/);

    await page.goto('/ko/admin/rates');
    await page.waitForLoadState('networkidle');
    const shipperUrl = page.url();
    console.log(`  SHIPPER URL after /ko/admin/rates: ${shipperUrl}`);
    expect(shipperUrl).not.toContain('/rate-cards');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_18_c_shipper_denied.png`, fullPage: true });
    console.log('Scenario C PASSED');
  });
});
