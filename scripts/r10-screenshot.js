const { chromium } = require('playwright-core');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'tests', 'e2e', 'screenshots');
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required. Copy from .env.local');

const serviceClient = createClient(
  'http://127.0.0.1:54321',
  supabaseServiceKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function ensureAdminUser() {
  const { data: users } = await serviceClient.auth.admin.listUsers();
  const existing = users?.users?.find(u => u.email === ADMIN_EMAIL);
  if (existing) return existing.id;

  const { data } = await serviceClient.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'ADMIN', org_type: 'PLATFORM', status: 'ACTIVE' },
  });
  if (data?.user) {
    await serviceClient.from('zen_profiles').upsert({
      id: data.user.id,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      grade_code: 'ADMIN',
      status: 'ACTIVE',
    });
  }
  return data?.user?.id;
}

async function main() {
  console.log('Ensuring admin user...');
  const adminUserId = await ensureAdminUser();
  console.log('Admin user ready:', adminUserId);

  // Cleanup old test data
  console.log('Cleaning up old test data...');
  await serviceClient.from('zen_ups_actual_charges').delete().like('ups_invoice_no', 'UPS-R10-%');
  await serviceClient.from('zen_order_costs').delete().filter('order_id', 'in', '(select id from zen_orders where order_no like \'R10-%\')');
  await serviceClient.from('zen_invoices').delete().like('invoice_no', 'R10-INV-%');
  await serviceClient.from('zen_orders').delete().like('order_no', 'R10-%');
  await serviceClient.from('zen_organizations').delete().like('name', 'R10 Screenshot%');

  // 1. Create organization (shipper)
  console.log('Creating organization...');
  const { data: org } = await serviceClient.from('zen_organizations').insert({
    name: 'R10 Screenshot Org',
    type: 'SHIPPER',
    status: 'ACTIVE',
  }).select('id').single();
  const orgId = org.id;
  console.log('Org ID:', orgId);

  // Link admin to org
  console.log('Linking admin to org...');
  await serviceClient.from('zen_profiles').upsert({
    id: adminUserId,
    org_id: orgId,
    email: ADMIN_EMAIL,
    role: 'ADMIN',
    grade_code: 'ADMIN',
    status: 'ACTIVE',
  });

  // 2. Create DELIVERED order
  const orderNo = `R10-${Date.now()}`;
  console.log('Creating order:', orderNo);
  const { data: order, error: orderErr } = await serviceClient.from('zen_orders').insert({
    order_no: orderNo,
    status: 'DELIVERED',
    shipper_id: orgId,
    transport_mode: 'UPS',
    order_date: new Date().toISOString(),
    cargo_details: [{ description: 'Test cargo', weight: 10, unit: 'kg' }],
    order_type: 'B2B',
    delivery_method: 'DIRECT',
    shipper_contact_name: 'Test',
    shipper_contact_phone: '010-0000-0000',
  }).select('*').single();
  if (orderErr) { console.error('Order insert error:', JSON.stringify(orderErr)); return; }
  const orderId = order.id;
  console.log('Order ID:', orderId);

  // 3. Create order costs (estimated = 1200)
  console.log('Creating order costs...');
  const { data: costsData, error: costsErr } = await serviceClient.from('zen_order_costs').insert([
    { order_id: orderId, cost_type: 'BASE_FREIGHT', unit_price: 1000, quantity: 1, currency: 'USD' },
    { order_id: orderId, cost_type: 'FUEL_SURCHARGE', unit_price: 200, quantity: 1, currency: 'USD' },
  ]).select();
  if (costsErr) console.error('Costs insert error:', costsErr.message);
  else console.log('Costs inserted:', costsData?.length);

  // 4. Create non-finalized invoice
  const invDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  console.log('Creating invoice...');
  const { data: invoice, error: invErr } = await serviceClient.from('zen_invoices').insert({
    invoice_no: `R10-INV-${invDate}-${Date.now()}`,
    shipper_id: orgId,
    status: 'UNPAID',
    total_amount: 1200,
    currency: 'USD',
    due_date: new Date().toISOString().slice(0, 10),
    created_by: adminUserId,
    metadata: { source_order_id: orderId },
    is_finalized: false,
  }).select('id').single();
  if (invErr) { console.error('Invoice insert error:', JSON.stringify(invErr)); return; }
  console.log('Invoice ID:', invoice.id);

  // Link costs to invoice
  await serviceClient.from('zen_order_costs').update({ invoice_id: invoice.id }).eq('order_id', orderId);

  // 5. Create UPS actual charges (amount = 1500, variance = +300)
  console.log('Creating UPS actual charges...');
  const { data: upsData, error: upsErr } = await serviceClient.from('zen_ups_actual_charges').insert([
    { order_id: orderId, charge_type: 'FUEL SURCHARGE', charge_amount: 1500, currency: 'USD', ups_invoice_no: 'UPS-R10-001', ups_invoice_date: new Date().toISOString().slice(0, 10) },
  ]).select('*');
  if (upsErr) console.error('UPS insert error:', JSON.stringify(upsErr));
  else console.log('UPS charges:', upsData.length);

  const browser = await chromium.launch({ headless: true });

  try {
    // Screenshot 1: Pre-finalization
    console.log('--- Screenshot 1: Pre-finalization ---');
    const ctx1 = await browser.newContext({ locale: 'ko', viewport: { width: 1280, height: 800 } });
    const page1 = await ctx1.newPage();
    await page1.goto('http://localhost:3000/ko/login');
    await page1.waitForLoadState('networkidle');
    await page1.waitForTimeout(1000);
    await page1.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page1.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page1.click('button[type="submit"]');
    await page1.waitForTimeout(5000);
    await page1.goto(`http://localhost:3000/ko/orders/${orderId}`);
    await page1.waitForLoadState('networkidle');
    await page1.waitForTimeout(5000);
    const innerText1 = await page1.evaluate(() => document.body.innerText);
    console.log('Page text (pre) length:', innerText1.length);
    const preIdx = innerText1.indexOf('인보이스');
    const preIdx2 = innerText1.indexOf('추가 인보이스');
    console.log('Pre - 인보이스 at:', preIdx, '추가 at:', preIdx2);
    if (preIdx >= 0) console.log('Pre text around:', innerText1.substring(Math.max(0, preIdx - 50), preIdx + 100));
    if (preIdx2 >= 0) console.log('Pre text around 2:', innerText1.substring(Math.max(0, preIdx2 - 50), preIdx2 + 100));
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'r10_pre_finalization_variance.png'), fullPage: true });
    console.log('Screenshot 1 saved');
    await ctx1.close();

    // Finalize invoice
    console.log('Finalizing invoice...');
    await serviceClient.from('zen_invoices').update({
      is_finalized: true,
      finalized_at: new Date().toISOString(),
      finalized_by: adminUserId,
      finalized_reason: 'R-10 screenshot test',
    }).eq('id', invoice.id);

    // Screenshot 2: Post-finalization
    console.log('--- Screenshot 2: Post-finalization ---');
    const ctx2 = await browser.newContext({ locale: 'ko', viewport: { width: 1280, height: 800 } });
    const page2 = await ctx2.newPage();
    await page2.goto('http://localhost:3000/ko/login');
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(1000);
    await page2.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page2.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page2.click('button[type="submit"]');
    await page2.waitForTimeout(5000);
    await page2.goto(`http://localhost:3000/ko/orders/${orderId}`);
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(5000);
    const innerText2 = await page2.evaluate(() => document.body.innerText);
    console.log('Page text (post) length:', innerText2.length);
    const postIdx = innerText2.indexOf('인보이스');
    const postIdx2 = innerText2.indexOf('추가 인보이스');
    console.log('Post - 인보이스 at:', postIdx, '추가 at:', postIdx2);
    if (postIdx >= 0) console.log('Post text around:', innerText2.substring(Math.max(0, postIdx - 50), postIdx + 100));
    if (postIdx2 >= 0) console.log('Post text around 2:', innerText2.substring(Math.max(0, postIdx2 - 50), postIdx2 + 100));
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, 'r10_post_finalization_variance.png'), fullPage: true });
    console.log('Screenshot 2 saved');
    await ctx2.close();

    console.log('Screenshots saved successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
    console.log('Done. Data kept for review - cleanup: delete org', orgId, 'order', orderId);
  }
}

main();
