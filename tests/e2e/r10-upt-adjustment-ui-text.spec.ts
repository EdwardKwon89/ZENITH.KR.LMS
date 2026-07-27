import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');

const serviceClient = createClient('http://127.0.0.1:54321', supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

test.describe('R-10: UPS Adjustment UI Text Verification', () => {

  let orderId: string;
  let shipperId: string;

  test.beforeAll(async () => {
    // 1. Ensure admin user exists
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const adminUser = existingUsers?.users?.find((u: any) => u.email === ADMIN_EMAIL);

    // 2. Create a test shipper
    const { data: existingShipper } = await serviceClient
      .from('zen_shippers')
      .select('id')
      .eq('email', 'screenshot-shipper@zenith.kr')
      .maybeSingle();

    if (existingShipper) {
      shipperId = existingShipper.id;
    } else {
      const { data: newShipper } = await serviceClient
        .from('zen_shippers')
        .insert({
          shipper_no: 'SCR-SHIP-001',
          name: 'Screenshot Test Shipper',
          email: 'screenshot-shipper@zenith.kr',
          country: 'KR',
          status: 'ACTIVE',
        })
        .select('id')
        .single();
      shipperId = newShipper!.id;
    }

    // 3. Create a DELIVERED test order
    const orderNo = `SCR-UI-${Date.now()}`;
    const { data: order } = await serviceClient
      .from('zen_orders')
      .insert({
        order_no: orderNo,
        status: 'DELIVERED',
        shipper_id: shipperId,
        transport_mode: 'AIR',
        created_at: new Date().toISOString(),
        delivery_date: new Date().toISOString(),
      })
      .select('id')
      .single();
    orderId = order!.id;

    // 4. Create order costs (estimated total = 1200)
    await serviceClient
      .from('zen_order_costs')
      .insert([
        { order_id: orderId, cost_type: 'BASE_FREIGHT', unit_price: 1000, quantity: 1, currency: 'USD', charge_amount: 1000 },
        { order_id: orderId, cost_type: 'FUEL_SURCHARGE', unit_price: 200, quantity: 1, currency: 'USD', charge_amount: 200 },
      ]);

    // 5. Create a non-finalized invoice
    const invDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const { data: invoice } = await serviceClient
      .from('zen_invoices')
      .insert({
        invoice_no: `SCR-INV-${invDate}-001`,
        shipper_id: shipperId,
        status: 'ISSUED',
        total_amount: 1200,
        currency: 'USD',
        issued_at: new Date().toISOString(),
        metadata: { source_order_id: orderId },
        is_finalized: false,
      })
      .select('id')
      .single();

    // 6. Create UPS actual charges (amount = 1500, variance = +300)
    await serviceClient
      .from('zen_ups_actual_charges')
      .insert([
        { order_id: orderId, charge_type: 'FUEL SURCHARGE', charge_amount: 1500, currency: 'USD', ups_invoice_no: 'UPS-12345', ups_invoice_date: new Date().toISOString().slice(0, 10) },
      ]);

    // Link costs to invoice
    await serviceClient
      .from('zen_order_costs')
      .update({ invoice_id: invoice!.id })
      .eq('order_id', orderId);
  });

  test('Screenshot 1: Pre-finalization variance text', async ({ page }) => {
    await page.goto('/ko/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_pre_finalization_variance.png'),
      fullPage: true,
    });

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('인보이스 금액이 자동 갱신됩니다');
  });

  test('Screenshot 2: Post-finalization variance text', async ({ page }) => {
    // Finalize the invoice
    const { data: invoice } = await serviceClient
      .from('zen_invoices')
      .select('id')
      .eq('metadata->>source_order_id', orderId)
      .single();

    if (invoice) {
      const { data: users } = await serviceClient.auth.admin.listUsers();
      const adminUserId = users?.users?.find((u: any) => u.email === ADMIN_EMAIL)?.id;
      await serviceClient
        .from('zen_invoices')
        .update({
          is_finalized: true,
          finalized_at: new Date().toISOString(),
          finalized_by: adminUserId,
          finalized_reason: 'R-10 screenshot test',
        })
        .eq('id', invoice.id);
    }

    await page.goto('/ko/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[data-action="login"]');
    await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'r10_post_finalization_variance.png'),
      fullPage: true,
    });

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('추가 인보이스가 신규 발행되었습니다');
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (orderId) {
      await serviceClient.from('zen_ups_actual_charges').delete().eq('order_id', orderId);
      await serviceClient.from('zen_order_costs').delete().eq('order_id', orderId);
      await serviceClient.from('zen_invoices').delete().filter('metadata->>source_order_id', 'eq', orderId);
      await serviceClient.from('zen_orders').delete().eq('id', orderId);
    }
    if (shipperId) {
      await serviceClient.from('zen_shippers').delete().eq('id', shipperId);
    }
  });
});
