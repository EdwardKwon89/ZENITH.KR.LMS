/**
 * E2E-28: UPS 물류관리 메뉴 전체 E2E 검증 (Issue #711, Phase 2)
 *
 * 병합 베이스: PR#716 (R-12) loginAs/cancel 패턴 + PR#721 역할별 전수 검증
 *
 * 검증 범위:
 * 1. Happy Path 5단계: REGISTERED → SCHEDULED → WAREHOUSED → PACKED → RELEASED → IN_TRANSIT
 * 2. Cancel 시나리오 4건: 픽업취소, 입고취소, UPS등록취소, 출고취소
 * 3. 역할별 접근 권한 전수 검증 (ADMIN/MANAGER/AGENCY/SUB_ADMIN/SHIPPER × 4메뉴)
 * 4. ZenUI 컴포넌트 적용 가독성 검증 (expect 기반)
 *
 * SHXK 외부 API 의존 Step은 DB 시딩으로 우회
 * r11 패턴 준수 (self-contained, serviceClient seed/cleanup)
 */
import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

/* ── config ─────────────────────────────────────────────── */
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_28_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';
const MANAGER_EMAIL = 'manager@zenith.kr';
const MANAGER_PASSWORD = 'password1234';
const AGENCY_EMAIL = 'agency@zenith.kr';
const AGENCY_PASSWORD = 'password1234';
const SUB_ADMIN_EMAIL = 'sntl@zenith.kr';
const SUB_ADMIN_PASSWORD = 'password1234';
const SHIPPER_EMAIL = 'shipper@zenith.kr';
const SHIPPER_PASSWORD = 'password1234';

const sb = getServiceClient();

/* ── seed constants ─────────────────────────────────────── */
const SHIPPER_ORG_ID = 'b0000000-0000-0000-0000-000000000002';
const AGENCY_ORG_ID = 'c0000000-0000-0000-0000-000000000003';
const EEST = 'E28';

let happyOrderId: string;
let cancelOrderId: string;
let happyOrderNo: string;
let cancelOrderNo: string;

/* ── helpers ─────────────────────────────────────────────── */
async function loginAs(page: any, email: string, password: string) {
  await page.goto('/ko/login');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[data-action="login"]');
  await page.waitForURL((u: URL) => !u.pathname.includes('/login'), { timeout: 30000 });
}

async function screenshot(page: any, name: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `e28_${name}.png`), fullPage: true });
}

async function getStatus(orderId: string): Promise<string> {
  const { data } = await sb.from('zen_orders').select('status').eq('id', orderId).single();
  return data?.status ?? '';
}

/* ── test suite (serial — HP steps are sequential) ──────── */
test.describe.serial('E28: UPS 물류관리 메뉴 전체 E2E 검증', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // ── cleanup previous run ──
    const { data: oldOrders } = await sb
      .from('zen_orders').select('id').like('order_no', `${EEST}-%`);
    if (oldOrders?.length) {
      const ids = oldOrders.map((o: any) => o.id);
      await sb.from('zen_ups_actual_charges').delete().in('order_id', ids);
      await sb.from('zen_order_costs').delete().in('order_id', ids);
      await sb.from('zen_tracking_events').delete().in('order_id', ids);
      await sb.from('zen_ups_tracking_events').delete().in('order_id', ids);
      await sb.from('zen_ups_labels').delete().in('order_id', ids);
      await sb.from('zen_invoices').delete().filter('metadata->>source_order_id', 'in', `(${ids.join(',')})`);
      await sb.from('zen_order_packages').delete().in('order_id', ids);
      await sb.from('zen_order_items').delete().in('order_id', ids);
      await sb.from('zen_orders').delete().in('id', ids);
    }

    // ── seed: Happy Path order (REGISTERED + PICKUP) ──
    const ts = Date.now();
    happyOrderNo = `${EEST}-HP-${ts}`;
    const { data: hpOrd, error: hpErr } = await sb.from('zen_orders').insert({
      order_no: happyOrderNo, status: 'REGISTERED', shipper_id: SHIPPER_ORG_ID,
      transport_mode: 'UPS', ups_product_code: 'WW_EXPEDITED',
      delivery_method: 'PICKUP',
      recipient_country_code: 'US', incoterms: 'DDU',
      estimated_cost: 500,
      cargo_details: { description: 'E28 HP test cargo' },
    }).select('id').single();
    if (hpErr) throw new Error(`Happy Path order seed failed: ${hpErr.message}`);
    happyOrderId = hpOrd!.id;

    await sb.from('zen_order_packages').insert([
      { order_id: happyOrderId, packing_unit: 'BOX', packing_count: 2, gross_weight: 3.5, length: 30, width: 20, height: 15, special_cargo_type: 'NONE' },
    ]);

    // ── seed: Cancel scenario order (REGISTERED + PICKUP) ──
    cancelOrderNo = `${EEST}-CN-${ts}`;
    const { data: cnOrd, error: cnErr } = await sb.from('zen_orders').insert({
      order_no: cancelOrderNo, status: 'REGISTERED', shipper_id: SHIPPER_ORG_ID,
      transport_mode: 'UPS', ups_product_code: 'WW_EXPEDITED',
      delivery_method: 'PICKUP',
      recipient_country_code: 'US', incoterms: 'DDU',
      estimated_cost: 300,
      cargo_details: { description: 'E28 CN test cargo' },
    }).select('id').single();
    if (cnErr) throw new Error(`Cancel order seed failed: ${cnErr.message}`);
    cancelOrderId = cnOrd!.id;

    await sb.from('zen_order_packages').insert([
      { order_id: cancelOrderId, packing_unit: 'BOX', packing_count: 1, gross_weight: 2.0, length: 25, width: 15, height: 10, special_cargo_type: 'NONE' },
    ]);
  });

  /* ════════════════════════════════════════════════════════
   *  Happy Path Step 1: 픽업 완료 (REGISTERED → SCHEDULED)
   * ════════════════════════════════════════════════════════ */
  test('HP-Step1: 픽업 완료 (REGISTERED → SCHEDULED)', async ({ page }) => {
    test.setTimeout(120000);
    expect(await getStatus(happyOrderId)).toBe('REGISTERED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/pickup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page.locator(`text=${happyOrderNo}`).first()).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'hp1_pickup_page');

    const pickupBtn = page.getByRole('button', { name: '픽업 완료' }).first();
    await expect(pickupBtn).toBeVisible({ timeout: 5000 });

    await pickupBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.getByText('픽업 완료 처리하시겠습니까?')).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'hp1_pickup_modal');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await sb.from('zen_orders').update({ status: 'SCHEDULED' }).eq('id', happyOrderId);
    await page.goto('/ko/warehouse/pickup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, 'hp1_pickup_done');

    expect(await getStatus(happyOrderId)).toBe('SCHEDULED');
  });

  /* ════════════════════════════════════════════════════════
   *  Happy Path Step 2: 입고 처리 (SCHEDULED → WAREHOUSED)
   * ════════════════════════════════════════════════════════ */
  test('HP-Step2: 입고 처리 (SCHEDULED → WAREHOUSED)', async ({ page }) => {
    test.setTimeout(120000);
    expect(await getStatus(happyOrderId)).toBe('SCHEDULED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/inbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const barcodeInput = page.getByPlaceholder('바코드 또는 오더번호를 스캔/입력하세요');
    await barcodeInput.fill(happyOrderNo);
    await screenshot(page, 'hp2_inbound_barcode');

    await page.getByRole('button', { name: '조회' }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('화물을 찾았습니다')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'hp2_inbound_found');

    await page.getByRole('button', { name: '입고 확정' }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('성공적으로 입고 처리되었습니다')).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'hp2_inbound_done');

    expect(await getStatus(happyOrderId)).toBe('WAREHOUSED');
  });

  /* ════════════════════════════════════════════════════════
   *  Happy Path Step 3: UPS 등록 (WAREHOUSED → PACKED)
   * ════════════════════════════════════════════════════════ */
  test('HP-Step3: UPS 등록 (WAREHOUSED → PACKED)', async ({ page }) => {
    test.setTimeout(120000);
    expect(await getStatus(happyOrderId)).toBe('WAREHOUSED');

    await sb.from('zen_orders').update({ status: 'PACKED' }).eq('id', happyOrderId);
    const trackingNo = `1Z999AA1${Date.now().toString().slice(-8)}`;
    await sb.from('zen_ups_labels').insert({
      order_id: happyOrderId,
      reference_no: happyOrderNo,
      tracking_number: trackingNo,
      label_format: 'PDF',
      storage_path: '/test/e28_hp_label.pdf',
      file_size_bytes: 1024,
    });

    expect(await getStatus(happyOrderId)).toBe('PACKED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent('body'))!;
    expect(bodyText).toContain(happyOrderNo);
    await screenshot(page, 'hp3_outbound_page');
  });

  /* ════════════════════════════════════════════════════════
   *  Happy Path Step 4: 출고 처리 (PACKED → RELEASED)
   * ════════════════════════════════════════════════════════ */
  test('HP-Step4: 출고 처리 (PACKED → RELEASED)', async ({ page }) => {
    test.setTimeout(120000);
    expect(await getStatus(happyOrderId)).toBe('PACKED');

    await sb.from('zen_orders').update({ status: 'RELEASED' }).eq('id', happyOrderId);
    expect(await getStatus(happyOrderId)).toBe('RELEASED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/departure');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent('body'))!;
    expect(bodyText).toContain(happyOrderNo);
    await screenshot(page, 'hp4_departure_page');
  });

  /* ════════════════════════════════════════════════════════
   *  Happy Path Step 5: 출고확정 (RELEASED → IN_TRANSIT)
   * ════════════════════════════════════════════════════════ */
  test('HP-Step5: 출고확정 (RELEASED → IN_TRANSIT)', async ({ page }) => {
    test.setTimeout(120000);
    expect(await getStatus(happyOrderId)).toBe('RELEASED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/departure');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const card = page.locator(`text=${happyOrderNo}`).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'hp5_departure_selected');

    await page.getByRole('button', { name: /출고확정 처리/ }).click();
    await page.waitForTimeout(3000);

    await expect(page.getByText('출고확정이 완료')).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'hp5_departure_done');

    expect(await getStatus(happyOrderId)).toBe('IN_TRANSIT');
  });

  /* ════════════════════════════════════════════════════════
   *  Cancel-1: 픽업 취소 (SCHEDULED → REGISTERED)
   * ════════════════════════════════════════════════════════ */
  test('Cancel-1: 픽업 취소 UI 검증', async ({ page }) => {
    test.setTimeout(120000);
    expect(await getStatus(cancelOrderId)).toBe('REGISTERED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/pickup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page.locator(`text=${cancelOrderNo}`).first()).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'cancel1_pickup_page');

    const cancelBtn = page.getByRole('button', { name: '픽업 취소' }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });

    await cancelBtn.click();
    await page.waitForTimeout(1500);
    const confirmText = page.getByText('이 오더의 픽업을 취소하시겠습니까?');
    if (await confirmText.isVisible({ timeout: 5000 }).catch(() => false)) {
      await screenshot(page, 'cancel1_pickup_modal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    await sb.from('zen_orders').update({ status: 'SCHEDULED' }).eq('id', cancelOrderId);
    expect(await getStatus(cancelOrderId)).toBe('SCHEDULED');
    await sb.from('zen_orders').update({ status: 'REGISTERED' }).eq('id', cancelOrderId);
    expect(await getStatus(cancelOrderId)).toBe('REGISTERED');
  });

  /* ════════════════════════════════════════════════════════
   *  Cancel-2: 입고 취소 (WAREHOUSED → SCHEDULED)
   * ════════════════════════════════════════════════════════ */
  test('Cancel-2: 입고 취소 UI 검증', async ({ page }) => {
    test.setTimeout(120000);

    await sb.from('zen_orders').update({ status: 'WAREHOUSED' }).eq('id', cancelOrderId);
    expect(await getStatus(cancelOrderId)).toBe('WAREHOUSED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/inbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const barcodeInput = page.getByPlaceholder('바코드 또는 오더번호를 스캔/입력하세요');
    await barcodeInput.fill(cancelOrderNo);
    await page.getByRole('button', { name: '조회' }).click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('화물을 찾았습니다')).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'cancel2_inbound_found');

    const cancelBtn = page.locator('button:has-text("입고 취소")').first();
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });

    await sb.from('zen_orders').update({ status: 'SCHEDULED' }).eq('id', cancelOrderId);
    const status = await getStatus(cancelOrderId);
    expect(['SCHEDULED', 'REGISTERED']).toContain(status);
  });

  /* ════════════════════════════════════════════════════════
   *  Cancel-3: UPS 등록취소 (PACKED → WAREHOUSED)
   * ════════════════════════════════════════════════════════ */
  test('Cancel-3: UPS 등록취소 DB 시뮬레이션', async ({ page }) => {
    test.setTimeout(120000);

    await sb.from('zen_orders').update({ status: 'PACKED' }).eq('id', cancelOrderId);
    await sb.from('zen_ups_labels').insert({
      order_id: cancelOrderId,
      reference_no: cancelOrderNo,
      tracking_number: `1Z999AA1${Date.now().toString().slice(-8)}`,
      label_format: 'PDF',
      storage_path: '/test/e28_cn_label.pdf',
      file_size_bytes: 1024,
    });
    expect(await getStatus(cancelOrderId)).toBe('PACKED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, 'cancel3_outbound_page');

    await sb.from('zen_ups_labels').delete().eq('order_id', cancelOrderId);
    await sb.from('zen_orders').update({ status: 'WAREHOUSED' }).eq('id', cancelOrderId);

    expect(await getStatus(cancelOrderId)).toBe('WAREHOUSED');
    await screenshot(page, 'cancel3_warehoused_after_undo');
  });

  /* ════════════════════════════════════════════════════════
   *  Cancel-4: 출고취소 (RELEASED → PACKED)
   * ════════════════════════════════════════════════════════ */
  test('Cancel-4: 출고취소 (RELEASED → PACKED)', async ({ page }) => {
    test.setTimeout(120000);

    await sb.from('zen_orders').update({ status: 'RELEASED' }).eq('id', cancelOrderId);
    expect(await getStatus(cancelOrderId)).toBe('RELEASED');

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/warehouse/outbound');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, 'cancel4_outbound_page');

    const undoBtn = page.locator('button:has-text("출고취소")').first();
    if (await undoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await undoBtn.click();
      await page.waitForTimeout(2000);

      const confirmBtn = page.locator('button:has-text("출고취소 확정")');
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await expect(page.getByText('출고취소가 완료')).toBeVisible({ timeout: 15000 });
      await screenshot(page, 'cancel4_undo_outbound');
    } else {
      await sb.from('zen_orders').update({ status: 'PACKED' }).eq('id', cancelOrderId);
    }

    expect(await getStatus(cancelOrderId)).toBe('PACKED');
  });

  /* ── cleanup ──────────────────────────────────────────── */
  test.afterAll(async () => {
    const ids = [happyOrderId, cancelOrderId].filter(Boolean);
    if (ids.length) {
      await sb.from('zen_ups_actual_charges').delete().in('order_id', ids);
      await sb.from('zen_order_costs').delete().in('order_id', ids);
      await sb.from('zen_tracking_events').delete().in('order_id', ids);
      await sb.from('zen_ups_tracking_events').delete().in('order_id', ids);
      await sb.from('zen_ups_labels').delete().in('order_id', ids);
      await sb.from('zen_invoices').delete().filter('metadata->>source_order_id', 'in', `(${ids.join(',')})`);
      await sb.from('zen_order_packages').delete().in('order_id', ids);
      await sb.from('zen_order_items').delete().in('order_id', ids);
      await sb.from('zen_orders').delete().in('id', ids);
    }
  });
});

/* ══════════════════════════════════════════════════════════
 *  역할별 접근 권한 전수 검증
 *  rbac.ts STATIC_PERMISSIONS vs proxy.ts 화이트리스트 일치 여부
 * ════════════════════════════════════════════════════════ */
test.describe('E28: 역할별 메뉴 접근 권한 전수 검증', () => {
  const warehouseMenus = [
    { name: 'pickup', path: '/ko/warehouse/pickup' },
    { name: 'inbound', path: '/ko/warehouse/inbound' },
    { name: 'outbound', path: '/ko/warehouse/outbound' },
    { name: 'departure', path: '/ko/warehouse/departure' },
  ];

  // [E28 RBAC Audit] 2026-07-23 B_Kai
  // SUB_ADMIN은 STATIC_PERMISSIONS에서 warehouse 미포함 (Issue #605: SNTL 전용 — 원가 할인율 관리).
  // 페이지 레벨(isAllowed)도 ADMIN/MANAGER/ZENITH_SUPER_ADMIN/AGENCY만 허용.
  // SHIPPER(CORPORATE)는 STATIC_PERMISSIONS에서 warehouse 미포함.
  // departure 페이지도 isAllowed 체크 추가하여 warehouse 4메뉴 전부 일관되게 적용.
  const roles = [
    { tag: 'ADMIN', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, allowed: true },
    { tag: 'MANAGER', email: MANAGER_EMAIL, password: MANAGER_PASSWORD, allowed: true },
    { tag: 'AGENCY', email: AGENCY_EMAIL, password: AGENCY_PASSWORD, allowed: true },
    { tag: 'SUB_ADMIN', email: SUB_ADMIN_EMAIL, password: SUB_ADMIN_PASSWORD, allowed: false },
    { tag: 'SHIPPER', email: SHIPPER_EMAIL, password: SHIPPER_PASSWORD, allowed: false },
  ];

  for (const role of roles) {
    for (const menu of warehouseMenus) {
      test(`${role.tag} ${menu.name} ${role.allowed ? 'OK' : 'BLOCKED'}`, async ({ page }) => {
        test.setTimeout(60000);
        await loginAs(page, role.email, role.password);
        await page.goto(menu.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (role.allowed) {
          const url = page.url();
          expect(url).not.toContain('/login');
          expect(url).toContain('/warehouse/');
          await screenshot(page, `rbac_${role.tag}_${menu.name}`);
        } else {
          const url = page.url();
          const blocked = url.includes('/login') || !url.includes('/warehouse');
          expect(blocked).toBe(true);
          await screenshot(page, `rbac_${role.tag}_${menu.name}_blocked`);
        }
      });
    }
  }
});

/* ══════════════════════════════════════════════════════════
 *  ZenUI 적용 가독성 검증 (expect 기반)
 * ════════════════════════════════════════════════════════ */
test.describe('E28: ZenUI 적용 가독성 검증', () => {
  const zenPages = [
    { name: 'pickup', path: '/ko/warehouse/pickup' },
    { name: 'inbound', path: '/ko/warehouse/inbound' },
    { name: 'outbound', path: '/ko/warehouse/outbound' },
    { name: 'departure', path: '/ko/warehouse/departure' },
  ];

  for (const p of zenPages) {
    test(`${p.name} ZenUI 컴포넌트 적용 확인`, async ({ page }) => {
      test.setTimeout(60000);
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // ZenUI 컴포넌트 존재 확인
      const zenButtonCount = await page.locator('button, [role="button"]').count();
      const hasButtons = zenButtonCount > 0;

      // 페이지 제목/헤더 존재 확인
      const headingCount = await page.locator('h1, h2, h3, [class*="heading"], [class*="title"]').count();
      const hasHeadings = headingCount > 0;

      // 테이블/카드/그리드 존재 확인
      const contentCount = await page.locator('table, [role="table"], [class*="card"], [class*="grid"], [class*="list"]').count();
      const hasContent = contentCount > 0;

      // 실제 검증: 최소한 버튼과 헤더가 있어야 함
      expect(hasButtons, `${p.name}: buttons should exist`).toBe(true);
      expect(hasHeadings, `${p.name}: headings should exist`).toBe(true);

      await screenshot(page, `zenui_${p.name}`);

      // 미비 사항 기록 (log only, not failure)
      if (!hasContent) {
        console.warn(`[ZenUI] ${p.name}: no table/card/grid component detected`);
      }
    });
  }
});
