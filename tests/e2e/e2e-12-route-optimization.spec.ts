import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables for Supabase access
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_ORDER_ID = 'd197352a-ba9f-4640-9176-c50c852d8138';
const ADMIN_EMAIL = 'admin_e2e@zenith.kr';
const ADMIN_PASSWORD = 'password1234!';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_12_Result';

test.describe('E2E-12: Route Optimization Workflow', () => {
  
  test.beforeAll(async () => {
    // 1. Create screenshot directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // 2. DB Cleanup: Ensure fresh state for the test order
    console.log(`[Setup] Cleaning up route data for order: ${TEST_ORDER_ID}`);
    
    // Delete existing route and options
    await supabase.from('zen_order_routes').delete().eq('order_id', TEST_ORDER_ID);
    await supabase.from('zen_route_options').delete().eq('order_id', TEST_ORDER_ID);

    // Set order status to PENDING as required by scenario
    await supabase.from('zen_orders').update({ status: 'PENDING' }).eq('id', TEST_ORDER_ID);
  });

  test('Route Optimization Scenario: 3 Options -> Selection -> Milestone Timeline', async ({ page }) => {
    test.setTimeout(120000);

    // --- Step 1: Login & Access Order Detail ---
    console.log('Step 1: Admin Login & Access Order Detail');
    await page.goto('/ko/login');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("로그인")');
    
    await expect(page).toHaveURL(/\/dashboard|orders/, { timeout: 30000 });
    
    await page.goto(`/ko/orders/${TEST_ORDER_ID}`);
    await page.waitForLoadState('networkidle');

    // Verify RouteOptimizationSection is visible
    const routeSection = page.locator('section').filter({ hasText: '경로 최적화' }).first();
    await expect(routeSection).toBeVisible({ timeout: 15000 });

    // Click "경로 계산하기" to generate options
    const calcButton = routeSection.locator('button:has-text("경로 계산하기")');
    if (await calcButton.isVisible()) {
        await calcButton.click();
    } else {
        await routeSection.locator('button:has-text("경로 재계산")').click();
    }

    // Wait for 3 options to appear
    await expect(routeSection.locator('text=최저비용')).toBeVisible({ timeout: 20000 });
    await expect(routeSection.locator('text=최단시간')).toBeVisible();
    await expect(routeSection.locator('text=최적균형')).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_12_01_route_options.png` });
    console.log('✅ Step 1: Route options displayed');

    // --- Step 2: DB Verification ---
    console.log('Step 2: Verifying 3 options in DB');
    const { data: options } = await supabase
      .from('zen_route_options')
      .select('option_type')
      .eq('order_id', TEST_ORDER_ID);
    
    expect(options?.length).toBe(3);
    console.log('✅ Step 2: 3 records found in zen_route_options');

    // --- Step 3: Select BALANCED route & Confirm ---
    console.log('Step 3: Selecting BALANCED route');
    // Find the card containing "최적균형" stably
    const balancedCard = routeSection.locator('div.relative').filter({ hasText: '최적균형' }).first();
    await balancedCard.locator('button:has-text("이 경로 선택")').click();

    // Wait for button state change to "선택됨"
    await expect(balancedCard.locator('button:has-text("선택됨")')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_12_02_balanced_selected.png` });

    // Verify confirmation green box
    await expect(page.locator('text=최종 확정된 경로입니다')).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_12_03_route_confirmed.png` });
    
    // Verify DB update for selected route
    const { data: route } = await supabase
      .from('zen_order_routes')
      .select('selected_option_id')
      .eq('order_id', TEST_ORDER_ID)
      .single();
    expect(route?.selected_option_id).not.toBeNull();
    console.log('✅ Step 3: Route selected and confirmed');

    // --- Step 4: Milestone Timeline 시각화 확인 ---
    console.log('Step 4: Milestone Timeline Verification');
    
    // Refresh page to ensure server-side badge (RouteConsistencyBadge) is updated
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify RouteConsistencyBadge (경로 정합)
    await expect(page.locator('text=경로 정합')).toBeVisible({ timeout: 15000 });

    // Wait for timeline loading
    await expect(page.locator('text=경로 마일스톤')).toBeVisible({ timeout: 15000 });
    
    // In our Mock BALANCED route, we expect "Incheon Hub" as a via point
    await expect(page.locator('text=Incheon Hub')).toBeVisible();
    // Milestones should be in PENDING status initially
    await expect(page.locator('text=PENDING').first()).toBeVisible();
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_12_04_milestone_timeline.png` });
    console.log('✅ Step 4: Milestone timeline visible with correct data');
  });
});
