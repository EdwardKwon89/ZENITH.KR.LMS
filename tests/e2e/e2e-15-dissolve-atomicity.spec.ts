import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_15_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';

test('E2E-15: Master Order Dissolve Atomicity', async ({ page }) => {
  test.setTimeout(120000);

  // ── Step 1: Login via UI ──
  await page.goto('/ko/login');
  await page.fill('input#email', ADMIN_EMAIL);
  await page.fill('input#password', ADMIN_PASSWORD);

  await Promise.all([
    page.waitForURL(url => url.pathname !== '/ko/login', { timeout: 20000 }),
    page.click('button[data-action="login"]'),
  ]);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_15_01_login.png`, fullPage: true });
  console.log('✅ Step 1: Admin login');

  // ── Step 2: Create admin Supabase client ──
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const supabase = createClient(SUPABASE_URL, key);

  const { data: profile } = await supabase
    .from('zen_profiles').select('id').eq('email', ADMIN_EMAIL).maybeSingle();
  expect(profile).toBeTruthy();
  const adminUserId = profile!.id;
  console.log('  Admin user ID:', adminUserId);

  // ── Step 3: Get E2E test orders ──
  const { data: houseOrders, error: fetchErr } = await supabase
    .from('zen_orders')
    .select('id, order_no, master_order_id, status')
    .in('order_no', ['E2E-SEED-001', 'E2E-SEED-002']);
  expect(fetchErr).toBeNull();
  expect(houseOrders?.length).toBe(2);

  // Ensure orders are unlinked before starting
  const houseIds = houseOrders!.map(o => o.id);
  await supabase.from('zen_orders').update({ master_order_id: null, status: 'PACKED' }).in('id', houseIds);
  console.log('✅ Step 2: Test orders ready');

  // ── Step 4: Create a master order ──
  const masterNo = `E2E-MASTER-${Date.now()}`;
  const { data: master, error: createErr } = await supabase
    .from('zen_master_orders')
    .insert({ master_no: masterNo, status: 'CREATED', created_by: adminUserId })
    .select('id, master_no')
    .single();
  expect(createErr).toBeNull();
  expect(master).toBeTruthy();
  console.log('✅ Step 3: Master order created:', masterNo);

  // ── Step 5: Link house orders to master ──
  const { error: linkErr } = await supabase
    .from('zen_orders')
    .update({ master_order_id: master!.id, status: 'MASTERED' })
    .in('id', houseIds);
  expect(linkErr).toBeNull();

  // ── Step 6: Verify pre-dissolve state ──
  const { data: preCheck } = await supabase
    .from('zen_orders')
    .select('id, order_no, master_order_id, status')
    .in('id', houseIds);
  for (const order of preCheck || []) {
    expect(order.master_order_id).toBe(master!.id);
    expect(order.status).toBe('MASTERED');
  }
  console.log('✅ Step 4: House orders linked to master');

  // ── Step 7: Call dissolve_master_order_atomic RPC ──
  const { error: rpcErr } = await supabase.rpc('dissolve_master_order_atomic', {
    p_master_order_id: master!.id,
    p_user_id: adminUserId,
  });
  expect(rpcErr).toBeNull();
  console.log('✅ Step 5: dissolve_master_order_atomic RPC called');

  // ── Step 8: Verify post-dissolve state ──
  // 8a. House orders unlinked (master_order_id = NULL, status = 'REGISTERED')
  const { data: postCheck } = await supabase
    .from('zen_orders')
    .select('id, order_no, master_order_id, status')
    .in('id', houseIds);
  for (const order of postCheck || []) {
    expect(order.master_order_id).toBeNull();
    expect(order.status).toBe('REGISTERED');
  }

  // 8b. Master order deleted from zen_master_orders
  const { data: deletedMaster } = await supabase
    .from('zen_master_orders')
    .select('id')
    .eq('id', master!.id)
    .maybeSingle();
  expect(deletedMaster).toBeNull();

  // 8c. Dissolution history recorded in zen_master_order_history
  const { data: history } = await supabase
    .from('zen_master_order_history')
    .select('master_no, prev_status, next_status, changed_by')
    .eq('master_no', masterNo)
    .single();
  expect(history).toBeTruthy();
  expect(history!.prev_status).toBe('MASTERED');
  expect(history!.next_status).toBe('DISSOLVED');
  expect(history!.changed_by).toBe(adminUserId);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/e2e_15_02_verification.png`, fullPage: true });
  console.log('✅ Step 6: Post-dissolve atomicity verified');

  // ── Step 9: Save result ──
  const fs = await import('fs');
  const resultPath = `${SCREENSHOT_DIR}/RESULT.md`;
  const resultContent = `# E2E-15 Dissolve Atomicity Result

**Status**: PASS

**검증 방식**: API 레벨 검증 (UI 경로 미확인 — \`dissolve_master_order_atomic\` RPC 직접 호출)

| Verification Item | Result |
|:-----------------|:------:|
| Admin login (UI) | ✅ |
| Master order created directly | ✅ |
| House orders linked (master_order_id, MASTERED) | ✅ |
| Pre-dissolve assertion | ✅ |
| dissolve_master_order_atomic RPC call | ✅ |
| House orders unlinked (master_order_id = NULL) | ✅ |
| House orders reverted to REGISTERED | ✅ |
| Master order deleted from zen_master_orders | ✅ |
| Dissolution history recorded (MASTERED → DISSOLVED) | ✅ |
`;
  fs.writeFileSync(resultPath, resultContent);
  console.log('📄 Result saved as PASS');
});
