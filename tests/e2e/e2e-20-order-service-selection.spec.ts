import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'tests/e2e/screenshots';

const SHIPPER_EMAIL = 'shipper_e2e20b@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

let supabase: ReturnType<typeof getServiceClient>;

test.describe('E2E-20: Order Registration Service Combination Selection', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    supabase = getServiceClient();

    const orgNames = [
      'E2E20B Shipper Corp',
      'E2E20B Carrier Corp',
      'E2E20B Customs Broker',
      'E2E20B Delivery Agent',
    ];
    const emails = [SHIPPER_EMAIL];

    await supabase.from('zen_profiles').delete().in('email', emails);

    const { data: authUsersRes } = await supabase.auth.admin.listUsers();
    const authUsers = authUsersRes?.users || [];
    for (const email of emails) {
      const u = authUsers.find((au: any) => au.email === email);
      if (u) await supabase.auth.admin.deleteUser(u.id);
    }

    const { data: existingOrgs } = await supabase.from('zen_organizations').select('id').in('name', orgNames);
    if (existingOrgs && existingOrgs.length > 0) {
      const ids = existingOrgs.map((o: any) => o.id);
      await supabase.from('zen_order_services').delete().in('provider_id', ids);
      await supabase.from('zen_orders').delete().in('shipper_id', ids);
      await supabase.from('zen_customs_rates').delete().in('org_id', ids);
      await supabase.from('zen_delivery_rates').delete().in('org_id', ids);
      await supabase.from('zen_transport_costs').delete().in('carrier_id', ids);
      const { data: carriers } = await supabase.from('zen_carriers').select('id').in('org_id', ids);
      if (carriers && carriers.length > 0) {
        const cids = carriers.map((c: any) => c.id);
        await supabase.from('zen_rate_cards').delete().in('carrier_id', cids);
        await supabase.from('zen_route_network').delete().in('carrier_id', cids);
        await supabase.from('zen_carriers').delete().in('id', cids);
      }
      await supabase.from('zen_organizations').delete().in('id', ids);
    }

    const { data: sOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20B Shipper Corp', type: 'SHIPPER', status: 'ACTIVE' }).select().single();
    const { data: cOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20B Carrier Corp', type: 'CARRIER', status: 'ACTIVE' }).select().single();
    const { data: bOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20B Customs Broker', type: 'CUSTOMS', status: 'ACTIVE' }).select().single();
    const { data: dOrg } = await supabase.from('zen_organizations').insert({ name: 'E2E20B Delivery Agent', type: 'DELIVERY', status: 'ACTIVE' }).select().single();

    const shipperOrgId = sOrg!.id;
    const carrierOrgId = cOrg!.id;
    const brokerOrgId = bOrg!.id;
    const deliveryOrgId = dOrg!.id;

    const { data: carrierRec } = await supabase.from('zen_carriers').insert({
      code: 'E2E20B_CARRIER', name: 'E2E20B Carrier Corp', transport_mode: 'AIR', org_id: carrierOrgId, is_active: true
    }).select().single();

    const { data: icn } = await supabase.from('zen_ports').select('id').eq('code', 'ICN').single();
    const { data: sin } = await supabase.from('zen_ports').select('id').eq('code', 'SIN').single();

    await supabase.from('zen_rate_cards').insert({
      carrier_id: carrierRec!.id, transport_mode: 'AIR', origin_port_id: icn!.id, dest_port_id: sin!.id,
      tiers: [{ weight_min: 0, unit_price: 3.5, min_total_price: 50 }],
      carrier_cost: 2.0, margin_rate: 10.0, platform_fee_rate: 5.0,
      valid_from: '2026-06-01', valid_until: '2026-12-31', is_active: true
    });

    await supabase.from('zen_route_network').upsert({
      carrier_id: carrierRec!.id, from_port_id: 'ICN', to_port_id: 'SIN', transport_mode: 'AIR', transit_days: 1, is_active: true
    }, { onConflict: 'carrier_id,from_port_id,to_port_id,transport_mode' });

    await supabase.from('zen_customs_rates').insert({
      org_id: brokerOrgId, country_code: 'SG', currency: 'USD',
      cost_per_kg: 1.5, cost_per_cbm: 15.0, fixed_fee: 25.0, transit_days: 1,
      valid_from: '2026-06-01', is_active: true
    });

    await supabase.from('zen_delivery_rates').insert({
      org_id: deliveryOrgId, service_type: 'LOCAL', country_code: 'SG', currency: 'USD',
      cost_per_kg: 0.8, cost_per_cbm: 8.0, transit_days: 1,
      valid_from: '2026-06-01', is_active: true
    });

    // Try to create user; if already exists, use existing
    let authUserId: string | null = null;
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: SHIPPER_EMAIL, password: SHIPPER_PASSWORD, email_confirm: true,
      user_metadata: { full_name: 'E2E20B Shipper', role: 'CORPORATE' }
    });

    if (authUser?.user) {
      authUserId = authUser.user.id;
    } else {
      // User may already exist (auth delete failed in cleanup)
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users.find((u: any) => u.email === SHIPPER_EMAIL);
      if (existing) authUserId = existing.id;
    }

    if (authUserId) {
      await supabase.auth.admin.updateUserById(authUserId, {
        app_metadata: { role: 'CORPORATE', org_id: shipperOrgId, status: 'ACTIVE', org_type: 'SHIPPER' }
      });
      await supabase.from('zen_profiles').upsert({
        id: authUserId, org_id: shipperOrgId, email: SHIPPER_EMAIL,
        full_name: 'E2E20B Shipper', role: 'CORPORATE', status: 'ACTIVE'
      }, { onConflict: 'id' });
      console.log('Profile upserted with org_id:', shipperOrgId);
    }
  });

  async function loginAs(page: any, email: string, password: string) {
    console.log(`Logging in as: ${email}`);
    await page.context().clearCookies();
    await page.goto('/ko/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.evaluate(({ email, password }: { email: string; password: string }) => {
      const setNativeValue = (el: HTMLInputElement, val: string) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const ei = document.getElementById('email') as HTMLInputElement;
      const pi = document.getElementById('password') as HTMLInputElement;
      if (ei) setNativeValue(ei, email);
      if (pi) setNativeValue(pi, password);
    }, { email, password });
    await page.waitForTimeout(300);
    await Promise.all([
      page.waitForURL((url: URL) => url.pathname !== '/ko/login', { timeout: 30000 }),
      page.click('button[data-action="login"]'),
    ]);
    console.log(`Logged in as: ${email}`);
  }

  test('E2E-20-A: CUSTOMS + DELIVERY service combination selection and order creation', async ({ page }) => {
    test.setTimeout(120000);

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('button:has-text("항공")').click();
    await page.waitForTimeout(500);

    await page.selectOption('select[name="origin_port_id"]', { label: '[ICN] Incheon International Airport' });
    await page.selectOption('select[name="dest_port_id"]', { label: '[SIN] Singapore Changi Airport' });

    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.fill('input[name="recipient_name"]', 'Recipient E2E20B-A');
    await page.fill('[name="recipient_address"]', '10 SIN Road, Singapore');
    await page.fill('input[name="recipient_phone"]', '6512345678');

    await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '100');

    await page.fill('input[name="packages.0.items.0.item_name"]', 'E2E20B Combo Cargo');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');

    await page.click('button:has-text("다음 단계 (서비스 선택)")');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("항공 + 통관 + 배송(Local)")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("다음 단계 (요율 확인)")');
    await page.waitForTimeout(3000);

    await expect(page.locator('text=항공 운송')).toBeVisible();
    await expect(page.locator('text=통관 서비스')).toBeVisible();
    await expect(page.locator('text=현지 배송 (Local)')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/e2e20-a-step3.png', fullPage: true });

    const submitBtnA = page.locator('button:has-text("오더 등록하기")').first();
    await expect(submitBtnA).toBeEnabled({ timeout: 10000 });
    page.on('console', msg => { if (msg.type() === 'error') console.log(`[PAGE ERROR]: ${msg.text()}`); });
    page.on('response', response => { if (response.status() >= 400) console.log(`[HTTP ${response.status()}]: ${response.url()}`); });
    await submitBtnA.click();
    try {
      await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    } catch (e) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e20-a-after-submit.png`, fullPage: true });
      const pageText = await page.textContent('body');
      const errorText = pageText!.match(/error|Error|오류|실패|등록|failed|Failed|not found/);
      if (errorText) console.log(`Page contains error text: ${errorText[0]}`);
      throw e;
    }
    console.log('Order submitted successfully (Scenario A).');

    const url = page.url();
    const match = url.match(/\/orders\/([a-f0-9-]+)/);
    if (match) {
      const orderId = match[1];
      console.log(`Order ID: ${orderId}`);

      const { data: services, error } = await supabase
        .from('zen_order_services')
        .select('service_type, provider_id, quoted_cost, status')
        .eq('order_id', orderId);

      expect(error).toBeNull();
      expect(services).toBeTruthy();

      const types = (services || []).map((s: any) => s.service_type).sort();
      expect(types).toContain('TRANSPORT');
      expect(types).toContain('CUSTOMS');
      expect(types).toContain('DELIVERY_LOCAL');
      expect(services!.every((s: any) => s.status === 'REQUESTED')).toBe(true);
      console.log(`Verified ${services!.length} zen_order_services records.`);
    }
  });

  test('E2E-20-B: Transport-only order (no CUSTOMS/DELIVERY services)', async ({ page }) => {
    test.setTimeout(120000);

    await loginAs(page, SHIPPER_EMAIL, SHIPPER_PASSWORD);
    await page.goto('/ko/orders/new');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('button:has-text("항공")').click();
    await page.waitForTimeout(500);

    await page.selectOption('select[name="origin_port_id"]', { label: '[ICN] Incheon International Airport' });
    await page.selectOption('select[name="dest_port_id"]', { label: '[SIN] Singapore Changi Airport' });

    await page.locator('text=수하인 정보').scrollIntoViewIfNeeded();
    await page.fill('input[name="recipient_name"]', 'Recipient E2E20B-B');
    await page.fill('[name="recipient_address"]', '20 SIN Road, Singapore');
    await page.fill('input[name="recipient_phone"]', '6512345678');

    await page.selectOption('select[name="packages.0.packing_unit"]', 'BOX');
    await page.fill('input[name="packages.0.packing_count"]', '1');
    await page.fill('input[name="packages.0.length"]', '10');
    await page.fill('input[name="packages.0.width"]', '10');
    await page.fill('input[name="packages.0.height"]', '10');
    await page.fill('input[name="packages.0.gross_weight"]', '50');

    await page.fill('input[name="packages.0.items.0.item_name"]', 'E2E20B Transport Only');
    await page.fill('input[name="packages.0.items.0.quantity"]', '1');

    await page.click('button:has-text("다음 단계 (서비스 선택)")');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("항공 운송만")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("다음 단계 (요율 확인)")');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'tests/e2e/screenshots/e2e20-b-step3.png', fullPage: true });

    const submitBtnB = page.locator('button:has-text("오더 등록하기")').first();
    const isDisabled = await submitBtnB.isDisabled();
    if (isDisabled) {
      console.log('Submit button is DISABLED - checking rates...');
      const pageText = await page.textContent('body');
      const errorSection = pageText!.match(/사용 가능 요율 없음|이용 불가|등록된 비용 정보가|오류/g);
      console.log('Error indicators found:', errorSection);
    }
    await expect(submitBtnB).toBeEnabled({ timeout: 10000 });
    page.on('console', msg => { if (msg.type() === 'error') console.log(`[PAGE ERROR]: ${msg.text()}`); });
    page.on('response', response => { if (response.status() >= 400) console.log(`[HTTP ${response.status()}]: ${response.url()}`); });
    await submitBtnB.click();
    try {
      await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 30000 });
    } catch (e) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e20-b-after-submit.png`, fullPage: true });
      const pageText = await page.textContent('body');
      const errorText = pageText!.match(/error|Error|오류|실패|등록|failed|Failed|not found|허용|필수|입력|확인/);
      if (errorText) console.log(`Page contains error text: ${errorText[0]}`);
      throw e;
    }
    console.log('Order submitted successfully (Scenario B).');

    const url = page.url();
    const match = url.match(/\/orders\/([a-f0-9-]+)/);
    if (match) {
      const orderId = match[1];
      console.log(`Order ID: ${orderId}`);

      const { data: services, error } = await supabase
        .from('zen_order_services')
        .select('service_type, provider_id, quoted_cost, status')
        .eq('order_id', orderId);

      expect(error).toBeNull();
      expect(services).toBeTruthy();

      const types = (services || []).map((s: any) => s.service_type);
      expect(types.filter((t: any) => t === 'CUSTOMS').length).toBe(0);
      expect(types.filter((t: any) => t === 'DELIVERY_LOCAL').length).toBe(0);
      expect(types).toContain('TRANSPORT');
      console.log(`Verified transport-only: ${services!.length} zen_order_services records (no CUSTOMS/DELIVERY).`);
    }
  });
});
