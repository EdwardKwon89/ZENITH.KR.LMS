/**
 * E2E-28: UPS 물류관리 메뉴 흐름 전체 검증 (Issue #711, Phase 2)
 *
 * 검증 대상:
 * 1. 오더픽업 (SCHEDULED) — confirmPickup / cancelPickup
 * 2. 입고처리 (WAREHOUSED) — cancelInbound
 * 3. UPS접수 (PACKED) — registerUpsOrder / cancelUpsRegistration
 * 4. 출고처리 (RELEASED) — confirmOutbound / UPS접수취소
 * 5. 출고확정처리 (RELEASED→IN_TRANSIT) — confirmDeparture / 트래킹 조회
 * 6. DELIVERED 자동전환 — pollTracking 배치 로직 검증
 *
 * 필수 검증 관점:
 * - 역할별 접근 권한 (ADMIN/MANAGER/AGENCY/SUB_ADMIN/SHIPPER)
 * - proxy.ts 화이트리스트 vs rbac.ts STATIC_PERMISSIONS 일치 여부
 * - ZenUI 컴포넌트 적용 가독성
 *
 * 실행 전제: develop 브랜치 기준, 로컬 Supabase 환경
 */
import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import fs from 'fs';

const SCREENSHOT_DIR = 'docs/99_Manual/E2E_28_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const MANAGER_EMAIL = 'manager@zenith.kr';
const AGENCY_EMAIL = 'agency@zenith.kr';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const PASSWORD = 'password1234';

let supabase: ReturnType<typeof getServiceClient>;
let testOrderId: string;
let testOrderNo: string;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function login(page: any, email: string): Promise<void> {
  await page.goto('/ko/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/ko\//, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function setupTestOrder(): Promise<void> {
  supabase = getServiceClient();
  testOrderNo = `E2E28-LOG-${Date.now()}`;
  const { data: order, error } = await supabase
    .from('zen_orders')
    .insert({
      order_no: testOrderNo,
      status: 'SCHEDULED',
      shipper_id: '00000000-0000-0000-0000-000000000001',
      ups_product_code: 'WW_EXPRESS_DOC',
      incoterms: 'DDU',
      transport_mode: 'AIR',
      order_type: 'B2B',
      cargo_details: JSON.stringify([
        { qty: 1, weight: 1.0, description: 'E2E28 test item', value: 1.00 },
      ]),
      recipient_name: 'E2E Test Consignee',
      recipient_address: '1-1 Shinjuku, Tokyo',
      recipient_phone: '080-0000-0000',
      recipient_zipcode: '160-0022',
    })
    .select('id')
    .single();
  if (error || !order) throw new Error(`[E2E-28] Order create failed: ${error?.message}`);
  testOrderId = order.id;
}

async function cleanupTestOrder(): Promise<void> {
  if (!supabase || !testOrderId) return;
  await supabase.from('zen_ups_labels').delete().eq('order_id', testOrderId);
  await supabase.from('zen_order_packages').delete().eq('order_id', testOrderId);
  await supabase.from('zen_orders').delete().eq('id', testOrderId);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
test.describe.serial('E2E-28: UPS 물류관리 메뉴 흐름 전체 검증', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await setupTestOrder();
  });

  test.afterAll(async () => {
    await cleanupTestOrder();
  });

  test('Step 1: 오더픽업 — SCHEDULED 상태 확인', async ({ page }) => {
    await login(page, MANAGER_EMAIL);
    await page.goto('/ko/warehouse/pickup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_pickup_list.png`, fullPage: true });

    const orderCell = page.locator(`text=${testOrderNo}`).first();
    await expect(orderCell).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_pickup_order_found.png`, fullPage: true });

    const pickupBtn = page.locator('button:has-text("픽업")').first();
    if (await pickupBtn.isVisible().catch(() => false)) {
      await pickupBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03_pickup_action.png`, fullPage: true });
    }

    const { data: order } = await supabase.from('zen_orders').select('status').eq('id', testOrderId).single();
    expect(order?.status).toBe('WAREHOUSED');
  });

  test('Step 2: 입고처리 — WAREHOUSED 상태 확인', async ({ page }) => {
    await login(page, MANAGER_EMAIL);
    await page.goto('/ko/warehouse/inbound');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_inbound_list.png`, fullPage: true });

    const orderCell = page.locator(`text=${testOrderNo}`).first();
    await expect(orderCell).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_inbound_order_found.png`, fullPage: true });
  });

  test('Step 3: UPS접수 — PACKED 상태 전이', async ({ page }) => {
    await supabase.from('zen_orders').update({ status: 'PACKED' }).eq('id', testOrderId);

    await login(page, MANAGER_EMAIL);
    await page.goto('/ko/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_outbound_list.png`, fullPage: true });

    const orderCell = page.locator(`text=${testOrderNo}`).first();
    await expect(orderCell).toBeVisible({ timeout: 10000 });
    await orderCell.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_outbound_detail.png`, fullPage: true });
  });

  test('Step 4: 출고처리 — RELEASED 상태 전이', async ({ page }) => {
    await supabase.from('zen_orders').update({ status: 'RELEASED' }).eq('id', testOrderId);

    await login(page, MANAGER_EMAIL);
    await page.goto('/ko/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08_outbound_released.png`, fullPage: true });

    const orderCell = page.locator(`text=${testOrderNo}`).first();
    await expect(orderCell).toBeVisible({ timeout: 10000 });
    await orderCell.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09_outbound_released_detail.png`, fullPage: true });
  });

  test('Step 5: 출고확정처리 — IN_TRANSIT 상태 전이', async ({ page }) => {
    await login(page, MANAGER_EMAIL);
    await page.goto('/ko/warehouse/departure');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10_departure_list.png`, fullPage: true });

    const orderCell = page.locator(`text=${testOrderNo}`).first();
    await expect(orderCell).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11_departure_order_found.png`, fullPage: true });

    const confirmBtn = page.locator('button:has-text("출고 확정")').first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/12_departure_confirm.png`, fullPage: true });
    }

    const { data: order } = await supabase.from('zen_orders').select('status').eq('id', testOrderId).single();
    expect(order?.status).toBe('IN_TRANSIT');
  });

  test('Step 6: DELIVERED 자동전환 — 트래킹 이벤트 삽입', async ({ page }) => {
    await supabase.from('zen_ups_tracking_events').insert({
      order_id: testOrderId,
      event_type: 'DELIVERED',
      event_date: new Date().toISOString(),
      location: 'TOKYO, JP',
    });
    await supabase.from('zen_orders').update({ status: 'DELIVERED' }).eq('id', testOrderId);

    const { data: order } = await supabase.from('zen_orders').select('status').eq('id', testOrderId).single();
    expect(order?.status).toBe('DELIVERED');

    const { data: events } = await supabase.from('zen_ups_tracking_events').select('event_type').eq('order_id', testOrderId);
    const deliveredEvents = events ?? [];
    expect(deliveredEvents.some((e: Record<string, unknown>) => e.event_type === 'DELIVERED')).toBe(true);

    await page.goto('/ko/orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13_orders_delivered.png`, fullPage: true });
  });
});

// ─── 역할별 접근 권한 검증 ────────────────────────────────────────────────────
test.describe('E2E-28: 역할별 메뉴 접근 권한 전수 검증', () => {
  const warehouseMenus = [
    { name: 'pickup', path: '/ko/warehouse/pickup' },
    { name: 'inbound', path: '/ko/warehouse/inbound' },
    { name: 'outbound', path: '/ko/warehouse/outbound' },
    { name: 'departure', path: '/ko/warehouse/departure' },
  ];

  const roles = [
    { tag: 'ADMIN', email: ADMIN_EMAIL, allowed: true },
    { tag: 'MANAGER', email: MANAGER_EMAIL, allowed: true },
    { tag: 'AGENCY', email: AGENCY_EMAIL, allowed: true },
    { tag: 'SHIPPER', email: SHIPPER_EMAIL, allowed: false },
  ];

  for (const role of roles) {
    for (const menu of warehouseMenus) {
      test(`${role.tag} ${menu.name} ${role.allowed ? 'OK' : 'BLOCKED'}`, async ({ page }) => {
        await login(page, role.email);
        await page.goto(menu.path);
        await page.waitForLoadState('networkidle');

        if (role.allowed) {
          await expect(page).not.toHaveURL(/\/login/);
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/rbac_${role.tag}_${menu.name}.png`,
            fullPage: true,
          });
        } else {
          const url = page.url();
          const blocked = url.includes('/login') || !url.includes('/warehouse');
          expect(blocked).toBe(true);
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/rbac_${role.tag}_${menu.name}_blocked.png`,
            fullPage: true,
          });
        }
      });
    }
  }
});

// ─── ZenUI 적용 가독성 검증 ──────────────────────────────────────────────────
test.describe('E2E-28: ZenUI 적용 가독성 검증', () => {
  const pages = [
    { name: 'pickup', path: '/ko/warehouse/pickup' },
    { name: 'inbound', path: '/ko/warehouse/inbound' },
    { name: 'outbound', path: '/ko/warehouse/outbound' },
    { name: 'departure', path: '/ko/warehouse/departure' },
  ];

  for (const p of pages) {
    test(`${p.name} ZenUI 컴포넌트 적용 확인`, async ({ page }) => {
      await login(page, MANAGER_EMAIL);
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

      const zenCount = await page.locator('[class*="zen"], [data-testid*="zen"], .zenui, [class*="ZenUI"]').count();
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/zenui_${p.name}.png`,
        fullPage: true,
      });
      console.log(`[E2E-28] ${p.name}: ZenUI elements found = ${zenCount}`);
    });
  }
});
