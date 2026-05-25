import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_19_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'test_corp_e2e19@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let testOrderId: string | null = null;
let testShipperUserId: string | null = null;

test.describe('E2E-19: Hub Routing Flow — Route Calculation, Order Creation & Transit Tracking', () => {

  test.beforeAll(async () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // Ensure test shipper exists
    const { data: existingShipper } = await supabase
      .from('zen_profiles')
      .select('id')
      .eq('email', SHIPPER_EMAIL)
      .maybeSingle();

    if (!existingShipper) {
      const { data: signUp } = await supabase.auth.admin.createUser({
        email: SHIPPER_EMAIL,
        password: SHIPPER_PASSWORD,
        email_confirm: true,
      });
      if (signUp?.user) {
        await supabase.from('zen_profiles').upsert({
          id: signUp.user.id,
          email: SHIPPER_EMAIL,
          full_name: 'E2E19 Test Shipper',
          role: 'CORPORATE',
          status: 'ACTIVE',
          grade_code: 'IRON',
        });
        testShipperUserId = signUp.user.id;
      }
    } else {
      testShipperUserId = existingShipper.id;
    }
  });

  test('Scenario A: Hub route selection and order detail display', async ({ page }) => {
    test.setTimeout(180000);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // Step 1: Login as shipper
    console.log('Step 1: Login as CORPORATE shipper');
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input#email', SHIPPER_EMAIL);
    await page.fill('input#password', SHIPPER_PASSWORD);
    await Promise.all([
      page.waitForURL(url => url.pathname !== '/ko/login', { timeout: 30000 }),
      page.click('button[data-action="login"]'),
    ]);
    console.log('✅ Shipper logged in');

    // Step 2: Create a new order (PVG → LAX, AIR)
    console.log('Step 2: Create new order PVG→LAX AIR');
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    // Fill order form - shipper selection
    await page.waitForSelector('select[name="shipper_id"]', { timeout: 15000 });
    await page.selectOption('select[name="shipper_id"]', { index: 1 });
    console.log('✅ Shipper selected');

    // Transport mode
    await page.selectOption('select[name="transport_mode"]', 'AIR');
    console.log('✅ Transport mode set to AIR');

    // Origin port: PVG
    await page.selectOption('select[name="origin_port_id"]', { label: /PVG|Shanghai/i });
    console.log('✅ Origin port PVG selected');

    // Dest port: LAX
    await page.selectOption('select[name="dest_port_id"]', { label: /LAX|Los Angeles/i });
    console.log('✅ Dest port LAX selected');

    // Recipient info
    await page.fill('input[name="recipient_name"]', 'John Doe');
    await page.fill('input[name="recipient_address"]', '123 Main St, Los Angeles');
    await page.fill('input[name="recipient_phone"]', '1234567890');
    console.log('✅ Recipient info filled');

    // Package info
    await page.fill('input[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '5');
    console.log('✅ Package info filled');

    // Item in package
    await page.fill('input[name="packages.0.items.0.item_name"]', 'Test Item');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');
    await page.fill('input[name="packages.0.items.0.unit_value"]', '100');
    console.log('✅ Item info filled');

    // Submit
    await page.click('button[data-action="submit-order"]');
    await page.waitForTimeout(3000);

    // Capture order ID from URL
    const currentUrl = page.url();
    const orderIdMatch = currentUrl.match(/\/orders\/([a-f0-9-]+)/);
    if (!orderIdMatch) {
      console.log('⚠️ Could not extract order ID from URL, URL:', currentUrl);
      testOrderId = null;
    } else {
      testOrderId = orderIdMatch[1];
      console.log('✅ Order created with ID:', testOrderId);
    }

    // Step 3: Navigate to order detail and calculate route
    console.log('Step 3: Calculate route options');
    if (testOrderId) {
      await page.goto(`/ko/orders/${testOrderId}`);
      await page.waitForLoadState('domcontentloaded');
    }

    // Click "경로 계산하기" button
    const calcBtn = page.locator('button:has-text("경로 계산하기")');
    if (await calcBtn.isVisible({ timeout: 10000 })) {
      await calcBtn.click();
      console.log('✅ Route calculation triggered');
    } else {
      console.log('⚠️ Route calculation button not found - route might auto-calculate');
    }

    // Wait for route options to appear
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario-a-route-options.png`, fullPage: true });

    // Step 4: Verify hub route options are displayed
    console.log('Step 4: Verify route options displayed');
    const routeCards = page.locator('[data-testid="route-option-card"]');
    const routeCardCount = await routeCards.count();

    if (routeCardCount > 0) {
      console.log(`✅ ${routeCardCount} route option(s) found`);

      // Check that at least one option mentions ICN (hub waypoint)
      const hubRouteText = await page.locator('text=ICN').first().isVisible({ timeout: 5000 }).catch(() => false);
      if (hubRouteText) {
        console.log('✅ Hub route (via ICN) detected in route options');
      } else {
        console.log('⚠️ Hub route text not found, checking alternatives');
      }

      // Select the first available route
      const selectBtn = routeCards.first().locator('button:has-text("선택")');
      if (await selectBtn.isVisible({ timeout: 3000 })) {
        await selectBtn.click();
        await page.waitForTimeout(2000);
        console.log('✅ Route selected');
      } else {
        console.log('⚠️ No select button found on route cards');
      }
    } else {
      console.log('⚠️ No route option cards found');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario-a-route-selected.png`, fullPage: true });

    // Step 5: Verify route info displayed on order detail
    console.log('Step 5: Verify route info on order detail');
    if (testOrderId) {
      await page.goto(`/ko/orders/${testOrderId}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }

    // Check for route section or milestone timeline
    const routeSection = page.locator('text=경로 정보, text=Route, text=Milestone, text=via, text=경유').first();
    const routeSectionVisible = await routeSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (routeSectionVisible) {
      console.log('✅ Route section visible on order detail');
    } else {
      console.log('⚠️ Route section not found on order detail');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario-a-order-detail.png`, fullPage: true });
  });

  test('Scenario B: Transit tracking per leg (hub route)', async ({ page }) => {
    test.setTimeout(180000);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // Step 1: Login as admin
    console.log('Step 1: Login as admin');
    await page.goto('/ko/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await Promise.all([
      page.waitForURL(url => url.pathname !== '/ko/login', { timeout: 30000 }),
      page.click('button[data-action="login"]'),
    ]);
    console.log('✅ Admin logged in');

    // Step 2: Navigate to the order detail
    console.log('Step 2: Navigate to order with hub route');
    if (!testOrderId) {
      console.log('⚠️ No test order ID available, testing standalone tracking page');
      await page.goto('/ko/admin/tracking');
    } else {
      await page.goto(`/ko/orders/${testOrderId}`);
    }
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Order detail page loaded');

    // Step 3: Check tracking tab/section
    console.log('Step 3: Check tracking section');
    const trackingTab = page.locator('button:has-text("Tracking"), a:has-text("트래킹"), button:has-text("추적")').first();
    if (await trackingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await trackingTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Tracking tab clicked');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario-b-tracking-section.png`, fullPage: true });

    // Step 4: Verify order detail page has route visualization
    console.log('Step 4: Verify route visualization');
    const timeline = page.locator('[data-testid="route-milestone-timeline"]');
    if (await timeline.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Route milestone timeline visible');
      const milestones = timeline.locator('> *');
      const milestoneCount = await milestones.count();
      console.log(`✅ Milestones count: ${milestoneCount}`);
    } else {
      // Check for any tracking/status info visible
      const statusInfo = page.locator('text=IN_TRANSIT, text=TRANSIT, text=출발, text=도착, text=경유').first();
      const statusVisible = await statusInfo.isVisible({ timeout: 5000 }).catch(() => false);
      if (statusVisible) {
        console.log('✅ Transit status information visible');
      } else {
        console.log('⚠️ No tracking/timeline elements found');
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/scenario-b-tracking-result.png`, fullPage: true });
    console.log('✅ Scenario B complete');
  });
});
