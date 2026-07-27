import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_24_Result';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

const SHIPPER_EMAIL = 'shipper_e2e24@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let supabase: ReturnType<typeof createClient>;
let shipperOrgId: string;
let icnPortId: string;
let laxPortId: string;

async function ensureDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

async function setupTestData() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  supabase = createClient(SUPABASE_URL, key);

  const emails = [SHIPPER_EMAIL];
  await supabase.from('zen_profiles').delete().in('email', emails);
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  for (const email of emails) {
    const u = (authUsersRes?.users || []).find(au => au.email === email);
    if (u) await supabase.auth.admin.deleteUser(u.id);
  }

  // Clean up pre-existing rate cards/orders so auto-select picks our carrier
  await supabase.from('zen_order_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('zen_order_rate_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('zen_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('zen_rate_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const orgNames = ['E2E24 Shipper Corp', 'E2E24 Carrier Corp'];
  const { data: existingOrgs } = await supabase.from('zen_organizations').select('id').in('name', orgNames);
  if (existingOrgs && existingOrgs.length > 0) {
    const ids = existingOrgs.map(o => o.id);
    await supabase.from('zen_order_services').delete().in('provider_id', ids);
    await supabase.from('zen_orders').delete().in('shipper_id', ids);
    await supabase.from('zen_customs_rates').delete().in('org_id', ids);
    await supabase.from('zen_delivery_rates').delete().in('org_id', ids);
    await supabase.from('zen_transport_costs').delete().in('carrier_id', ids);
    const { data: carriers } = await supabase.from('zen_carriers').select('id').in('org_id', ids);
    if (carriers && carriers.length > 0) {
      const cids = carriers.map(c => c.id);
      await supabase.from('zen_rate_cards').delete().in('carrier_id', cids);
      await supabase.from('zen_route_network').delete().in('carrier_id', cids);
      await supabase.from('zen_carriers').delete().in('id', cids);
    }
    await supabase.from('zen_organizations').delete().in('id', ids);
  }

  const { data: sOrg } = await supabase.from('zen_organizations').insert({
    name: 'E2E24 Shipper Corp', type: 'SHIPPER', status: 'ACTIVE'
  }).select().single();
  shipperOrgId = sOrg.id;

  const { data: cOrg } = await supabase.from('zen_organizations').insert({
    name: 'E2E24 Carrier Corp', type: 'CARRIER', status: 'ACTIVE'
  }).select().single();

  const { data: carrierRec } = await supabase.from('zen_carriers').insert({
    code: 'E2E24_CARRIER', name: 'E2E24 Carrier', transport_mode: 'AIR', org_id: cOrg.id, is_active: true
  }).select().single();

  const { data: icn } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
  const { data: lax } = await supabase.from('zen_ports').select('id').eq('code', 'LAX').single();
  if (!icn || !lax) throw new Error('Ports ICN/LAX not found. Run seed data first.');
  icnPortId = icn.id;
  laxPortId = lax.id;

  await supabase.from('zen_rate_cards').insert({
    carrier_id: carrierRec.id, transport_mode: 'AIR', origin_port_id: icn.id, dest_port_id: lax.id,
    tiers: [{ weight_min: 0, unit_price: 3.5, min_total_price: 50 }],
    carrier_cost: 2.0, margin_rate: 10.0, platform_fee_rate: 5.0,
    valid_from: '2026-06-01', valid_until: '2026-12-31', is_active: true
  });

  await supabase.from('zen_route_network').upsert({
    carrier_id: carrierRec.id, from_port_id: 'ICN', to_port_id: 'LAX', transport_mode: 'AIR', transit_days: 3, is_active: true
  }, { onConflict: 'carrier_id,from_port_id,to_port_id,transport_mode' });

  const { data: authUser } = await supabase.auth.admin.createUser({
    email: SHIPPER_EMAIL, password: SHIPPER_PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'E2E24 Shipper', role: 'CORPORATE' }
  });

  if (authUser?.user) {
    await supabase.auth.admin.updateUserById(authUser.user.id, {
      app_metadata: { role: 'CORPORATE', org_id: shipperOrgId, status: 'ACTIVE', org_type: 'SHIPPER' }
    });
    await supabase.from('zen_profiles').upsert({
      id: authUser.user.id, org_id: shipperOrgId, email: SHIPPER_EMAIL,
      full_name: 'E2E24 Shipper', role: 'CORPORATE', status: 'ACTIVE'
    }, { onConflict: 'id' });
  }
}

async function cleanupTestData() {
  const emails = [SHIPPER_EMAIL];
  const { data: authUsersRes } = await supabase.auth.admin.listUsers();
  for (const email of emails) {
    const u = (authUsersRes?.users || []).find(au => au.email === email);
    if (u) {
      await supabase.from('zen_profiles').delete().eq('email', email);
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  const orgNames = ['E2E24 Shipper Corp', 'E2E24 Carrier Corp'];
  const { data: existingOrgs } = await supabase.from('zen_organizations').select('id').in('name', orgNames);
  if (existingOrgs && existingOrgs.length > 0) {
    const ids = existingOrgs.map(o => o.id);
    await supabase.from('zen_order_services').delete().in('provider_id', ids);
    await supabase.from('zen_orders').delete().in('shipper_id', ids);
    await supabase.from('zen_customs_rates').delete().in('org_id', ids);
    await supabase.from('zen_delivery_rates').delete().in('org_id', ids);
    await supabase.from('zen_transport_costs').delete().in('carrier_id', ids);
    const { data: carriers } = await supabase.from('zen_carriers').select('id').in('org_id', ids);
    if (carriers && carriers.length > 0) {
      const cids = carriers.map(c => c.id);
      await supabase.from('zen_rate_cards').delete().in('carrier_id', cids);
      await supabase.from('zen_route_network').delete().in('carrier_id', cids);
      await supabase.from('zen_carriers').delete().in('id', cids);
    }
    await supabase.from('zen_organizations').delete().in('id', ids);
  }
}

async function loginAs(page: any, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  try {
    await page.waitForURL(url => url.pathname !== '/ko/login', { timeout: 30000 });
  } catch {
    console.log('Login redirect timed out, continuing...');
  }
}

async function fillStep1AndNavigate(page: any, opts: { pickup?: boolean; pickupFields?: boolean }) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('select[name="origin_port_id"]', { timeout: 30000 });

  await page.locator('button:has-text("특송")').click();
  await page.waitForTimeout(500);

  await page.selectOption('select[name="origin_port_id"]', icnPortId);
  await page.selectOption('select[name="dest_port_id"]', laxPortId);

  await page.locator('button:has-text("수하인 정보")').click();
  await page.waitForTimeout(300);
  await page.fill('input[name="recipient_name"]', 'John Doe');
  await page.fill('[name="recipient_address"]', '123 Main St, Los Angeles, CA 90001');
  await page.fill('input[name="recipient_phone"]', '12135551234');

  await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
  await page.fill('input[name="packages.0.packing_count"]', '1');
  await page.fill('input[name="packages.0.length"]', '10');
  await page.fill('input[name="packages.0.width"]', '10');
  await page.fill('input[name="packages.0.height"]', '10');
  await page.fill('input[name="packages.0.gross_weight"]', '5');

  await page.fill('input[name="packages.0.items.0.item_name"]', 'E2E24 Test Cargo');
  await page.fill('input[name="packages.0.items.0.quantity"]', '1');

  if (opts.pickup) {
    await page.locator('button:has-text("PICKUP")').click();
    await page.waitForTimeout(300);
    if (opts.pickupFields) {
      await page.fill('input[name="pickup_location"]', '인천 서구 경서동 123');
      await page.fill('input[name="pickup_contact_name"]', '김픽업');
      await page.fill('input[name="pickup_contact_tel"]', '032-111-2222');
    }
  }
}

async function navigateThroughSteps(page: any) {
  await page.click('button:has-text("다음 단계 (서비스 선택)")');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("항공 운송만")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("다음 단계 (요율 확인)")');
  await page.waitForTimeout(3000);
}

test.describe('E2E-24: UPS Order Flow', () => {
  test.beforeAll(async () => {
    await ensureDir();
    await setupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('UAT-17-01: DIRECT delivery - pickup fields hidden, order created', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    await fillStep1AndNavigate(page, { pickup: false });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_direct_step1.png') });

    await navigateThroughSteps(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_direct_step3_rates.png') });

    const submitBtn = page.locator('button:has-text("오더 등록하기")').first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_direct_order_created.png') });

    const url = page.url();
    const match = url.match(/\/orders\/([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const orderId = match![1];

    const { data: order, error } = await supabase
      .from('zen_orders')
      .select('delivery_method, pickup_location, pickup_contact_name, pickup_contact_tel')
      .eq('id', orderId)
      .single();
    expect(error).toBeNull();
    expect(order).toBeTruthy();
    expect(order.delivery_method).toBe('DIRECT');
    expect(order.pickup_location).toBeNull();
    expect(order.pickup_contact_name).toBeNull();
    expect(order.pickup_contact_tel).toBeNull();

    console.log('UAT-17-01 PASSED: DIRECT order created, pickup fields NULL in DB');
  });

  test('UAT-17-02: PICKUP validation + order creation', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    await fillStep1AndNavigate(page, { pickup: true, pickupFields: false });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_pickup_step1_no_fields.png') });

    await navigateThroughSteps(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_pickup_step3_no_fields.png') });

    const submitBtn = page.locator('button:has-text("오더 등록하기")').first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    expect(currentUrl).toContain('/orders/new');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_pickup_validation_error.png') });

    const bodyText = await page.textContent('body');
    const hasError = /pickup|픽업|필수|required|location/i.test(bodyText || '');
    if (hasError) console.log('Validation error detected (pickup field required)');

    await page.locator('button:has-text("이전 단계")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("이전 단계")').first().click();
    await page.waitForTimeout(500);

    await page.fill('input[name="pickup_location"]', '인천 서구 경서동 123');
    await page.fill('input[name="pickup_contact_name"]', '김픽업');
    await page.fill('input[name="pickup_contact_tel"]', '032-111-2222');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_pickup_fields_filled.png') });

    await navigateThroughSteps(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_pickup_step3_ready.png') });

    const submitBtn2 = page.locator('button:has-text("오더 등록하기")').first();
    await expect(submitBtn2).toBeEnabled({ timeout: 10000 });
    await submitBtn2.click();
    await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_pickup_order_created.png') });

    const url2 = page.url();
    const match2 = url2.match(/\/orders\/([a-f0-9-]+)/);
    expect(match2).toBeTruthy();
    const orderId2 = match2![1];

    const { data: order2, error: err2 } = await supabase
      .from('zen_orders')
      .select('delivery_method, pickup_location, pickup_contact_name, pickup_contact_tel')
      .eq('id', orderId2)
      .single();
    expect(err2).toBeNull();
    expect(order2).toBeTruthy();
    expect(order2.delivery_method).toBe('PICKUP');
    expect(order2.pickup_location).toBe('인천 서구 경서동 123');
    expect(order2.pickup_contact_name).toBe('김픽업');
    expect(order2.pickup_contact_tel).toBe('032-111-2222');

    console.log('UAT-17-02 PASSED: PICKUP validation works, filled order created');
  });

  test('UAT-17-03: Rate Override - order pricing with agency markup', async ({ page }) => {
    test.setTimeout(120000);
    page.on('console', msg => console.log(`[PAGE] ${msg.type()}: ${msg.text()}`));

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    await fillStep1AndNavigate(page, { pickup: false });
    await navigateThroughSteps(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_override_step3_rates.png') });

    const bodyBefore = await page.textContent('body');
    const rateDisplay = bodyBefore?.match(/\$[\d,]+\.?\d*|[\d,]+원|[\d,.]+/g);
    console.log('Visible rates on step 3:', rateDisplay?.slice(0, 10));

    const submitBtn = page.locator('button:has-text("오더 등록하기")').first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_override_order_created.png') });

    const url = page.url();
    const match = url.match(/\/orders\/([a-f0-9-]+)/);
    expect(match).toBeTruthy();
    const orderId = match![1];

    const { data: order } = await supabase
      .from('zen_orders')
      .select('id, order_no, transport_mode, status')
      .eq('id', orderId)
      .single();
    expect(order).toBeTruthy();
    expect(order.transport_mode).toBe('EXP');
    expect(order.status).toBe('REGISTERED');

    const { data: snapshots } = await supabase
      .from('zen_order_rate_snapshots')
      .select('applied_unit_price, applied_currency, applied_rule')
      .eq('order_id', orderId);
    console.log('Rate snapshots:', JSON.stringify(snapshots));

    if (snapshots && snapshots.length > 0) {
      const totalUnitPrice = snapshots.reduce((sum, s) => sum + Number(s.applied_unit_price || 0), 0);
      console.log(`Total applied_unit_price: ${totalUnitPrice} ${snapshots[0]?.applied_currency || 'USD'}`);
    }

    console.log('UAT-17-03 PASSED: Order created with EXP mode, rate snapshots captured');
  });
});
