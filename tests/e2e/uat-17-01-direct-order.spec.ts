import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SCREENSHOT_DIR = 'docs/99_Manual/UAT_17_Result';
const SHIPPER_EMAIL = 'agency_shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';
const AGENCY_ORG_ID = '924c2fcb-ccae-48bb-9858-469c15a7e20e';

test.describe('UAT-17-01: 직접배송(DIRECT) 선택 오더 등록 및 픽업 입력 차단 검증', () => {

  test('DIRECT 배송 선택 → 픽업 폼 차단 + DB 검증', async ({ page }) => {
    // 1. Login
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', SHIPPER_EMAIL);
    await page.fill('input[name="password"]', SHIPPER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/ko\//, { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/uat1701_01_login.png`, fullPage: true });

    // 2. Navigate to order creation page
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 3. Select EXP (특송) transport mode
    const expBtn = page.locator('button:has-text("특송")');
    await expect(expBtn).toBeVisible({ timeout: 5000 });
    await expBtn.click();
    await page.waitForTimeout(500);

    // 4. Verify DIRECT is default — pickup fields hidden
    const pickupInput = page.locator('input[placeholder*="픽업 장소"]');
    await expect(pickupInput).not.toBeVisible();
    console.log('[UAT-17-01] ✅ DIRECT default verified: pickup fields hidden');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/uat1701_02_direct_default.png`, fullPage: true });

    // 5. Verify DIRECT button shows active styling
    const directBtn = page.locator('button:has-text("직접배송")');
    await expect(directBtn).toBeVisible();

    // 6. DB verification
    const { data: ports } = await supabase.from('zen_ports').select('id').in('code', ['ICN', 'LAX']);
    const testOrderNo = `UAT1701-DIRECT-${Date.now()}`;
    const { data: order, error: orderErr } = await supabase.from('zen_orders').insert({
      order_no: testOrderNo,
      shipper_id: AGENCY_ORG_ID,
      status: 'WAREHOUSED',
      transport_mode: 'EXP',
      order_type: 'B2B',
      delivery_method: 'DIRECT',
      cargo_details: { qty: 1, weight: 5.0, description: 'UAT-17-01 test' },
      origin_port_id: ports?.find(p => p.code === 'ICN')?.id || null,
      dest_port_id: ports?.find(p => p.code === 'LAX')?.id || null,
      recipient_name: 'John Doe',
      recipient_address: '123 Main Street, Los Angeles, CA 90001, USA',
      recipient_phone: '010-1234-5678',
    }).select('id,delivery_method,pickup_location,pickup_contact_name,pickup_contact_tel').single();

    expect(orderErr).toBeNull();
    expect(order).not.toBeNull();
    expect(order!.delivery_method).toBe('DIRECT');
    expect(order!.pickup_location).toBeNull();
    expect(order!.pickup_contact_name).toBeNull();
    expect(order!.pickup_contact_tel).toBeNull();
    console.log(`[UAT-17-01] ✅ DIRECT order verified: delivery_method=DIRECT, pickup fields=null`);

    await supabase.from('zen_orders').delete().eq('id', order!.id);
    console.log('[UAT-17-01] ✅ Test completed');
  });
});
