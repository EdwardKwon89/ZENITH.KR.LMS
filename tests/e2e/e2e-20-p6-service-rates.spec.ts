import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_20_Result';

const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';

const SHIPPER_EMAIL = 'test_shipper_e2e20@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

const CARRIER_EMAIL = 'test_carrier_e2e20@zenith.kr';
const CARRIER_PASSWORD = 'password1234';

const BROKER_EMAIL = 'test_broker_e2e20@zenith.kr';
const BROKER_PASSWORD = 'password1234';

const DELIVERY_EMAIL = 'test_delivery_e2e20@zenith.kr';
const DELIVERY_PASSWORD = 'password1234';

const OTHER_BROKER_EMAIL = 'another_broker_e2e20@zenith.kr';
const OTHER_BROKER_PASSWORD = 'password1234';

let shipperOrgId: string;
let carrierOrgId: string;
let brokerOrgId: string;
let deliveryOrgId: string;
let otherBrokerOrgId: string;
let adminOrgId: string;

let testOrderId: string | null = null;

test.describe('E2E-20: Phase 6 New Service Roles and Multi-Service Assignment', () => {

  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // 1. Clean up existing test users/profiles & organizations
    const emails = [
      SHIPPER_EMAIL,
      CARRIER_EMAIL,
      BROKER_EMAIL,
      DELIVERY_EMAIL,
      OTHER_BROKER_EMAIL,
      ADMIN_EMAIL
    ];

    // Delete old profiles by email first (catches orphan profiles whose auth user was already deleted)
    await supabase.from('zen_profiles').delete().in('email', emails);

    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const authUsers = authUsersRes?.users || [];

    for (const email of emails) {
      const authUser = authUsers.find(u => u.email === email);
      if (authUser) {
        // Delete auth user
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }

    const orgNames = [
      'E2E20 Shipper Corp',
      'E2E20 Carrier Corp',
      'E2E20 Customs Broker',
      'E2E20 Delivery Agent',
      'E2E20 Another Customs Broker'
    ];

    const { data: orgs } = await supabase
      .from('zen_organizations')
      .select('id')
      .in('name', orgNames);

    if (orgs && orgs.length > 0) {
      const orgIds = orgs.map(o => o.id);
      await supabase.from('zen_order_services').delete().in('provider_id', orgIds);
      await supabase.from('zen_orders').delete().in('shipper_id', orgIds);
      await supabase.from('zen_invoices').delete().in('shipper_id', orgIds);
      await supabase.from('zen_customs_rates').delete().in('org_id', orgIds);
      await supabase.from('zen_delivery_rates').delete().in('org_id', orgIds);
      await supabase.from('zen_transport_costs').delete().in('carrier_id', orgIds);

      const { data: carriers } = await supabase
        .from('zen_carriers')
        .select('id')
        .in('org_id', orgIds);

      if (carriers && carriers.length > 0) {
        const carrierIds = carriers.map(c => c.id);
        await supabase.from('zen_rate_cards').delete().in('carrier_id', carrierIds);
        await supabase.from('zen_route_network').delete().in('carrier_id', carrierIds);
        await supabase.from('zen_carriers').delete().in('id', carrierIds);
      }

      await supabase.from('zen_organizations').delete().in('id', orgIds);
    }

    // 2. Re-create Organizations
    const { data: sOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20 Shipper Corp', type: 'SHIPPER', status: 'ACTIVE' }).select().single();
    const { data: cOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20 Carrier Corp', type: 'CARRIER', status: 'ACTIVE' }).select().single();
    const { data: bOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20 Customs Broker', type: 'CUSTOMS', status: 'ACTIVE' }).select().single();
    const { data: dOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20 Delivery Agent', type: 'DELIVERY', status: 'ACTIVE' }).select().single();
    const { data: obOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20 Another Customs Broker', type: 'CUSTOMS', status: 'ACTIVE' }).select().single();

    shipperOrgId = sOrg.id;
    carrierOrgId = cOrg.id;
    brokerOrgId = bOrg.id;
    deliveryOrgId = dOrg.id;
    otherBrokerOrgId = obOrg.id;

    // Create Carrier Record
    await supabase.from('zen_carriers').insert({
      code: 'E2E20_CARRIER',
      name: 'E2E20 Carrier Corp',
      transport_mode: 'AIR',
      org_id: carrierOrgId,
      is_active: true
    });

    // Create another carrier for Sea
    await supabase.from('zen_carriers').insert({
      code: 'E2E20_CARRIER_SEA',
      name: 'E2E20 Carrier Corp (Sea)',
      transport_mode: 'SEA',
      org_id: carrierOrgId,
      is_active: true
    });

    // 3. Re-create Auth Users and sync Profiles
    const userList = [
      { email: SHIPPER_EMAIL, password: SHIPPER_PASSWORD, name: 'E2E20 Shipper User', role: 'CORPORATE', orgId: shipperOrgId, orgType: 'SHIPPER' },
      { email: CARRIER_EMAIL, password: CARRIER_PASSWORD, name: 'E2E20 Carrier User', role: 'CARRIER', orgId: carrierOrgId, orgType: 'CARRIER' },
      { email: BROKER_EMAIL, password: BROKER_PASSWORD, name: 'E2E20 Broker User', role: 'CUSTOMS_BROKER', orgId: brokerOrgId, orgType: 'CUSTOMS' },
      { email: DELIVERY_EMAIL, password: DELIVERY_PASSWORD, name: 'E2E20 Delivery User', role: 'DELIVERY_AGENT', orgId: deliveryOrgId, orgType: 'DELIVERY' },
      { email: OTHER_BROKER_EMAIL, password: OTHER_BROKER_PASSWORD, name: 'E2E20 Other Broker', role: 'CUSTOMS_BROKER', orgId: otherBrokerOrgId, orgType: 'CUSTOMS' },
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Admin', role: 'ADMIN', orgId: null, orgType: 'ADMIN' }
    ];
    // Assign admin to existing platform org (admin user may not have org_id in schema)

    for (const u of userList) {
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.name, role: u.role }
      });

      if (authUser?.user) {
        await supabase.auth.admin.updateUserById(authUser.user.id, {
          app_metadata: { role: u.role, org_id: u.orgId, status: 'ACTIVE', org_type: u.orgType }
        });

        await supabase.from('zen_profiles').upsert({
          id: authUser.user.id,
          org_id: u.orgId,
          email: u.email,
          full_name: u.name,
          role: u.role,
          status: 'ACTIVE',
          phone_number: '010-1234-5678'
        }, { onConflict: 'id' });
      }
    }
  });

  async function loginAs(page: any, email: string, password: string) {
    console.log(`Logging in as: ${email}`);
    page.on('console', (msg: any) => { console.log(`[PAGE ${msg.type().toUpperCase()}]: ${msg.text()}`); });
    await page.context().clearCookies();
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    // Use native DOM setter to bypass React controlled input re-render races
    await page.evaluate(({ email, password }: { email: string; password: string }) => {
      const setNativeValue = (el: any, val: string) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const ei = document.getElementById('email');
      const pi = document.getElementById('password');
      if (ei) setNativeValue(ei, email);
      if (pi) setNativeValue(pi, password);
    }, { email, password });
    await page.waitForTimeout(300);
    await Promise.all([
      page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 }),
      page.click('button[data-action="login"]'),
    ]);
    console.log(`✅ Logged in as: ${email}`);
  }

  async function selectPort(page: any, portCode: string) {
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      for (let j = 0; j < opts.length; j++) {
        if (opts[j].includes(`[${portCode}]`)) {
          await selects.nth(i).selectOption({ index: j });
          return;
        }
      }
    }
  }

  test('E2E-P6-01: CARRIER rate registration and Shipper order creation', async ({ page }) => {
    test.setTimeout(120000);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // 1. CARRIER registers rate card using admin role (since admin/rates inputs are disabled for Carrier on UI)
    console.log('Step 1: Admin registers rate card for Carrier');
    const { data: carrierRec } = await supabase
      .from('zen_carriers')
      .select('id')
      .eq('code', 'E2E20_CARRIER')
      .single();

    const { data: icnPort } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
    const { data: sinPort } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();

    // Register active rate card via direct DB insert for robust setup
    await supabase.from('zen_rate_cards').insert({
      carrier_id: carrierRec!.id,
      transport_mode: 'AIR',
      origin_port_id: icnPort!.id,
      dest_port_id: sinPort!.id,
      tiers: [{ weight_min: 0, unit_price: 3.5, min_total_price: 50 }],
      carrier_cost: 2.0,
      margin_rate: 10.0,
      platform_fee_rate: 5.0,
      valid_from: '2026-06-01',
      valid_until: '2026-12-31',
      is_active: true
    });

    // Auto-create Route Network row
    await supabase.from('zen_route_network').upsert({
      carrier_id: carrierRec!.id,
      from_port_id: 'ICN',
      to_port_id: 'SIN',
      transport_mode: 'AIR',
      transit_days: 1,
      is_active: true
    }, { onConflict: 'carrier_id,from_port_id,to_port_id,transport_mode' });

    console.log('✅ Carrier rate card registered');

    // 2. Shipper logs in and creates order selecting this carrier
    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-01-01-new-order.png`, fullPage: true });

    // Mode: AIR
    await page.locator('button:has-text("항공")').click();
    await page.waitForTimeout(500);

    // Select ports
    await page.selectOption('select[name="origin_port_id"]', { label: '[ICN] Incheon International Airport' });
    await page.selectOption('select[name="dest_port_id"]', { label: '[SIN] Singapore Changi Airport' });

    // Recipient info
    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.fill('input[name="recipient_name"]', 'Recipient SIN E2E20');
    await page.fill('[name="recipient_address"]', '10 SIN Boulevard, Singapore');
    await page.fill('input[name="recipient_phone"]', '6512345678');

    // Cargo details
    await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '100'); // 100 kg

    await page.fill('input[name="packages.0.items.0.item_name"]', 'E2E20 AIR Cargo');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-01-02-step1-filled.png`, fullPage: true });

    // Next: Service Selection (Step 2)
    await page.click('button:has-text("다음 단계 (서비스 선택)")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-01-03-step2-combos.png`, fullPage: true });

    // Select "항공 운송만" (AIR_ONLY)
    await page.click('button:has-text("항공 운송만")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-01-04-step2-selected.png`, fullPage: true });

    // Next: 요율 확인 (Step 3)
    await page.click('button:has-text("다음 단계 (요율 확인)")');
    await page.waitForTimeout(3000); // Wait for rate calculation
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-01-05-step3-rates.png`, fullPage: true });

    // Check estimated cost summary is visible
    await expect(page.locator('text=TOTAL ESTIMATED SERVICES COST')).toBeVisible();

    // Submit the order
    await page.click('button:has-text("오더 등록하기")');
    await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('✅ Order submitted and redirected successfully.');

    // Save order ID
    const url = page.url();
    const match = url.match(/\/orders\/([a-f0-9-]+)/);
    if (match) {
      testOrderId = match[1];
      console.log(`Created Order ID: ${testOrderId}`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-01-06-order-details.png`, fullPage: true });
  });

  test('E2E-P6-02: CUSTOMS_BROKER rate registration and Shipper order customs selection', async ({ page }) => {
    test.setTimeout(120000);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // 1. Insert customs rate directly for the broker's org
    const { data: brokerOrg } = await supabase.from('zen_organizations').select('id').eq('name', 'E2E20 Customs Broker').single();
    await supabase.from('zen_customs_rates').insert({
      org_id: brokerOrg!.id,
      country_code: 'SG',
      currency: 'USD',
      cost_per_kg: 1.5,
      cost_per_cbm: 15.0,
      fixed_fee: 25.0,
      transit_days: 1,
      valid_from: '2026-06-01',
      is_active: true
    });
    console.log('✅ Customs rate inserted for broker');

    // 2. Shipper logs in and creates order selecting AIR_CUSTOMS
    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    // Fill Step 1
    await page.locator('button:has-text("항공")').click();
    await page.selectOption('select[name="origin_port_id"]', { label: '[ICN] Incheon International Airport' });
    await page.selectOption('select[name="dest_port_id"]', { label: '[SIN] Singapore Changi Airport' });

    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.fill('input[name="recipient_name"]', 'Recipient E2E-P6-02');
    await page.fill('[name="recipient_address"]', '20 SIN Road, Singapore');
    await page.fill('input[name="recipient_phone"]', '6512345678');

    await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '50'); // 50 kg

    await page.fill('input[name="packages.0.items.0.item_name"]', 'E2E20 Customs Cargo');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');

    // Next
    await page.click('button:has-text("다음 단계 (서비스 선택)")');
    await page.waitForTimeout(1000);

    // Select "항공 + 통관" (AIR_CUSTOMS)
    await page.click('button:has-text("항공 + 통관")');
    await page.waitForTimeout(500);

    // Next
    await page.click('button:has-text("다음 단계 (요율 확인)")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-02-04-customs-rates-step3.png`, fullPage: true });

    // Verify both rates are available
    await expect(page.locator('text=항공 운송')).toBeVisible();
    await expect(page.locator('text=통관 서비스')).toBeVisible();

    // Submit
    await page.click('button:has-text("오더 등록하기")');
    await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('✅ E2E-P6-02 Shipper submitted order with customs service successfully.');
  });

  test('E2E-P6-03: DELIVERY_AGENT rate registration and Shipper order delivery selection', async ({ page }) => {
    test.setTimeout(120000);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // 1. Insert delivery rates directly for the delivery org
    const { data: deliveryOrg } = await supabase.from('zen_organizations').select('id').eq('name', 'E2E20 Delivery Agent').single();
    // Local delivery rate (SG)
    await supabase.from('zen_delivery_rates').insert({
      org_id: deliveryOrg!.id,
      service_type: 'LOCAL',
      country_code: 'SG',
      currency: 'USD',
      cost_per_kg: 0.8,
      cost_per_cbm: 8.0,
      transit_days: 1,
      valid_from: '2026-06-01',
      is_active: true
    });
    // Total delivery rate (ICN→SIN)
    await supabase.from('zen_delivery_rates').insert({
      org_id: deliveryOrg!.id,
      service_type: 'TOTAL',
      origin_code: 'ICN',
      dest_code: 'SIN',
      transport_mode: 'AIR',
      currency: 'USD',
      cost_per_kg: 5.0,
      cost_per_cbm: 20.0,
      transit_days: 2,
      valid_from: '2026-06-01',
      is_active: true
    });
    console.log('✅ Delivery rates inserted for delivery agent');

    // 2. Shipper logs in and creates order with DELIVERY_TOTAL
    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('button:has-text("항공")').click();
    await page.selectOption('select[name="origin_port_id"]', { label: '[ICN] Incheon International Airport' });
    await page.selectOption('select[name="dest_port_id"]', { label: '[SIN] Singapore Changi Airport' });

    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.fill('input[name="recipient_name"]', 'Recipient E2E-P6-03');
    await page.fill('[name="recipient_address"]', '30 SIN Road, Singapore');
    await page.fill('input[name="recipient_phone"]', '6512345678');

    await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '20'); // 20 kg

    await page.fill('input[name="packages.0.items.0.item_name"]', 'E2E20 Delivery Total Cargo');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');

    // Next
    await page.click('button:has-text("다음 단계 (서비스 선택)")');
    await page.waitForTimeout(1000);

    // Select "배송(Total) — All-in"
    await page.click('button:has-text("배송(Total) — All-in")');
    await page.waitForTimeout(500);

    // Next
    await page.click('button:has-text("다음 단계 (요율 확인)")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-03-02-total-rates-step3.png`, fullPage: true });

    // Submit
    await page.click('button:has-text("오더 등록하기")');
    await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    console.log('✅ E2E-P6-03 Shipper submitted order with Total Delivery service successfully.');
  });

  test('E2E-P6-04: Role-based order visibility isolation', async ({ page }) => {
    test.setTimeout(120000);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    const supabase = createClient(SUPABASE_URL, key);

    // 1. Create a specific order with sOrg, cOrg, bOrg, dOrg assigned
    console.log('Step 1: Create an order with Carrier, Broker, and Delivery assigned');
    
    // Use existing rate card (created by P6-01) or insert a fresh one
    const { data: carrierRec } = await supabase.from('zen_carriers').select('id').eq('code', 'E2E20_CARRIER').single();
    let { data: rateCard } = await supabase.from('zen_rate_cards').select('id').eq('carrier_id', carrierRec!.id).limit(1).maybeSingle();
    if (!rateCard) {
      const { data: icnPort } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
      const { data: sinPort } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();
      const { data: rc } = await supabase.from('zen_rate_cards').insert({
        carrier_id: carrierRec!.id, transport_mode: 'AIR', origin_port_id: icnPort!.id,
        dest_port_id: sinPort!.id, tiers: [{ weight_min: 0, unit_price: 3.5, min_total_price: 50 }],
        carrier_cost: 2.0, margin_rate: 10.0, platform_fee_rate: 5.0,
        valid_from: '2026-06-01', valid_until: '2026-12-31', is_active: true
      }).select().single();
      rateCard = rc;
    }
    const { data: brokerRate } = await supabase.from('zen_customs_rates').upsert({
      org_id: brokerOrgId, country_code: 'SG', cost_per_kg: 1.5, cost_per_cbm: 15.0,
      fixed_fee: 25.0, transit_days: 1, valid_from: '2026-06-01', is_active: true
    }, { onConflict: 'org_id,country_code,valid_from' }).select().single();
    const { data: deliveryRate } = await supabase.from('zen_delivery_rates').insert({
      org_id: deliveryOrgId, service_type: 'LOCAL', country_code: 'SG',
      cost_per_kg: 0.8, cost_per_cbm: 8.0, transit_days: 1, valid_from: '2026-06-01', is_active: true
    }).select().single();
    
    const { data: order, error: orderErr } = await supabase.from('zen_orders').insert({
      order_no: 'E2E20-P6-04-' + Date.now(),
      cargo_details: { description: 'Test cargo', pieces: 1, weight_kg: 100, volume_cbm: 1 },
      shipper_id: shipperOrgId,
      carrier_id: carrierOrgId,
      status: 'REGISTERED',
      transport_mode: 'AIR',
      origin_port_id: (await supabase.from('zen_ports').select('id').eq('code', 'ICN').single()).data!.id,
      dest_port_id: (await supabase.from('zen_ports').select('id').eq('code', 'SIN').single()).data!.id,
      recipient_name: 'Visibility Test',
      recipient_address: '123 Test St',
      recipient_phone: '1234'
    }).select().single();
    if (orderErr || !order) console.error('order insert error:', orderErr);

    // Insert order services
    await supabase.from('zen_order_services').insert([
      { order_id: order.id, service_type: 'TRANSPORT', provider_id: carrierOrgId, rate_card_id: rateCard!.id, quoted_cost: 350, currency: 'USD' },
      { order_id: order.id, service_type: 'CUSTOMS', provider_id: brokerOrgId, customs_rate_id: brokerRate.id, quoted_cost: 100, currency: 'USD' },
      { order_id: order.id, service_type: 'DELIVERY_LOCAL', provider_id: deliveryOrgId, delivery_rate_id: deliveryRate.id, quoted_cost: 50, currency: 'USD' }
    ]);

    // 2. Log in as test_broker_e2e20@zenith.kr (Assigned Broker) -> should see it
    await loginAs(page, BROKER_EMAIL, BROKER_PASSWORD);
    await page.goto('/ko/orders/assigned');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${order.order_no}`)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-04-01-assigned-broker-visible.png`, fullPage: true });

    // 3. Log in as another_broker_e2e20@zenith.kr (Unassigned Broker) -> should NOT see it
    await loginAs(page, OTHER_BROKER_EMAIL, OTHER_BROKER_PASSWORD);
    await page.goto('/ko/orders/assigned');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${order.order_no}`)).not.toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-04-02-unassigned-broker-hidden.png`, fullPage: true });

    // 4. Log in as test_shipper_e2e20@zenith.kr (Shipper) -> should see it in /orders
    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${order.order_no}`)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-04-03-shipper-visible.png`, fullPage: true });

    // 5. Log in as admin@zenith.kr (Admin) -> should see it in /orders
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${order.order_no}`)).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-04-04-admin-visible.png`, fullPage: true });

    console.log('✅ E2E-P6-04 RLS visibility isolation verified.');
  });

  test('E2E-P6-05: Block order submit if route/service rate is unavailable', async ({ page }) => {
    test.setTimeout(120000);

    // We choose a route or combo that doesn't have rates.
    // For example, destination port: NRT (Japan). We have registered no customs rates for JP.
    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    // Fill Step 1 to NRT
    await page.locator('button:has-text("항공")').click();
    await page.selectOption('select[name="origin_port_id"]', { label: '[ICN] Incheon International Airport' });
    await page.selectOption('select[name="dest_port_id"]', { label: '[NRT] Narita International Airport' }); // Destination Japan

    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.fill('input[name="recipient_name"]', 'Blocked User');
    await page.fill('[name="recipient_address"]', 'Tokyo, Japan');
    await page.fill('input[name="recipient_phone"]', '8112345678');

    await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '10');

    await page.fill('input[name="packages.0.items.0.item_name"]', 'Blocked Cargo');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');

    // Next
    await page.click('button:has-text("다음 단계 (서비스 선택)")');
    await page.waitForTimeout(1000);

    // Select "항공 + 통관" (AIR_CUSTOMS)
    await page.click('button:has-text("항공 + 통관")');
    await page.waitForTimeout(500);

    // Next (요율 확인)
    await page.click('button:has-text("다음 단계 (요율 확인)")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p6-05-01-blocked-step3.png`, fullPage: true });

    // Warning banner should be visible
    await expect(page.locator('text=이용 불가 서비스 감지')).toBeVisible();

    // The submit button "오더 등록하기" should be disabled
    const submitBtn = page.locator('button:has-text("오더 등록하기")').first();
    await expect(submitBtn).toBeDisabled();

    console.log('✅ E2E-P6-05 Block submission on unavailable service rates verified.');
  });
});
