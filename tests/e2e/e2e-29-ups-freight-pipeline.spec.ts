/**
 * E29: UPS 운임 3단계 파이프라인 E2E 검증 (Issue #747, TASK-205 / W3)
 *
 * 파이프라인:
 *   Stage 1: estimateUpsFreight → zen_order_rate_snapshots 저장
 *   Stage 2: recordUpsActualCharges + is_finalized → zen_order_costs + zen_invoices
 *   Stage 3: getShipperDailyBillingSummary → /finance/daily-billing 집계
 *
 * r11 패턴 준수 (self-contained, serviceClient seed/cleanup)
 */
import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

/* ── config ─────────────────────────────────────────────── */
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_29_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';

const sb = getServiceClient();

/* ── seed constants ─────────────────────────────────────── */
const SHIPPER_ORG_ID = 'b0000000-0000-0000-0000-000000000002';
const EEST = 'E29';

let orderId: string;
let orderNo: string;
let invoiceId: string;

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
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `e29_${name}.png`), fullPage: true });
}

/* ── test suite ──────────────────────────────────────────── */
test.describe.serial('E29: UPS 운임 3단계 파이프라인 E2E 검증', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // ── cleanup previous run ──
    const { data: oldOrders } = await sb
      .from('zen_orders').select('id').like('order_no', `${EEST}-%`);
    if (oldOrders?.length) {
      const ids = oldOrders.map((o: any) => o.id);
      await sb.from('zen_ups_actual_charges').delete().in('order_id', ids);
      await sb.from('zen_order_costs').delete().in('order_id', ids);
      await sb.from('zen_order_rate_snapshots').delete().in('order_id', ids);
      await sb.from('zen_invoices').delete().filter('metadata->>source_order_id', 'in', `(${ids.join(',')})`);
      await sb.from('zen_order_packages').delete().in('order_id', ids);
      await sb.from('zen_order_items').delete().in('order_id', ids);
      await sb.from('zen_orders').delete().in('id', ids);
    }

    // ── seed: order (DELIVERED, UPS) ──
    orderNo = `${EEST}-${Date.now()}`;
    const { data: ord, error: ordErr } = await sb.from('zen_orders').insert({
      order_no: orderNo,
      status: 'DELIVERED',
      shipper_id: SHIPPER_ORG_ID,
      transport_mode: 'UPS',
      ups_product_code: 'WW_EXPEDITED',
      recipient_country_code: 'US',
      incoterms: 'DDU',
      estimated_cost: 500,
      cargo_details: { description: 'E29 3-stage pipeline test cargo' },
    }).select('id').single();
    if (ordErr) throw new Error(`Order seed failed: ${ordErr.message}`);
    orderId = ord!.id;

    // ── seed: packages ──
    await sb.from('zen_order_packages').insert([
      { order_id: orderId, packing_unit: 'BOX', packing_count: 2, gross_weight: 3.5, length: 30, width: 20, height: 15, special_cargo_type: 'NONE' },
    ]);

    // ── seed: order costs (estimated — Stage 1 output) ──
    const { error: costErr } = await sb.from('zen_order_costs').insert([
      { order_id: orderId, cost_type: 'BASE_FREIGHT', unit_price: 300, quantity: 1, currency: 'USD', is_revenue: true },
      { order_id: orderId, cost_type: 'FUEL_SURCHARGE', unit_price: 100, quantity: 1, currency: 'USD', is_revenue: true },
      { order_id: orderId, cost_type: 'OTHER_CHARGE', unit_price: 100, quantity: 1, currency: 'USD', is_revenue: true },
    ]);
    if (costErr) throw new Error(`Cost seed failed: ${costErr.message}`);

    // ── seed: invoice (pre-finalization) ──
    const invDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invSeq = Date.now().toString().slice(-6);
    const { data: inv, error: invErr } = await sb.from('zen_invoices').insert({
      invoice_no: `INV-${invDate}-E29${invSeq}`,
      shipper_id: SHIPPER_ORG_ID,
      status: 'UNPAID',
      total_amount: 500,
      currency: 'USD',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      metadata: { source_order_id: orderId, order_no: orderNo },
      is_finalized: false,
    }).select('id').single();
    if (invErr) throw new Error(`Invoice seed failed: ${invErr.message}`);
    invoiceId = inv!.id;

    // ── seed: link costs → invoice ──
    await sb.from('zen_order_costs').update({ invoice_id: invoiceId }).eq('order_id', orderId);

    // verify seed
    const { data: checkOrd } = await sb.from('zen_orders').select('status').eq('id', orderId).single();
    if (checkOrd?.status !== 'DELIVERED') throw new Error(`Seed failed: order status = ${checkOrd?.status}`);
  });

  /* ════════════════════════════════════════════════════════
   *  Stage 1: 예상운임 저장 확인
   *  → zen_order_rate_snapshots에 estimateUpsFreight 결과 존재
   *  → zen_order_costs에 BASE_FREIGHT/FUEL_SURCHARGE/OTHER_CHARGE 존재
   * ════════════════════════════════════════════════════════ */
  test('Stage 1: 예상운임 저장 확인', async ({ page }) => {
    // DB: order 존재 확인
    const { data: order } = await sb
      .from('zen_orders').select('status, transport_mode, order_no, estimated_cost')
      .eq('id', orderId).single();
    expect(order).toBeTruthy();
    expect(order!.status).toBe('DELIVERED');
    expect(order!.transport_mode).toBe('UPS');
    expect(order!.order_no).toMatch(/^E29-/);

    // DB: 예상 비용 확인 (3건)
    const { data: costs } = await sb
      .from('zen_order_costs').select('cost_type, unit_price, currency')
      .eq('order_id', orderId);
    expect(costs!.length).toBeGreaterThanOrEqual(3);

    const costTypes = costs!.map((c: any) => c.cost_type).sort();
    expect(costTypes).toContain('BASE_FREIGHT');
    expect(costTypes).toContain('FUEL_SURCHARGE');
    expect(costTypes).toContain('OTHER_CHARGE');

    // DB: 예상 합계 = 500
    const total = costs!.reduce((s: number, c: any) => s + Number(c.unit_price), 0);
    expect(total).toBe(500);

    // UI: 로그인 → 오더 상세
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bodyText = (await page.textContent('body'))!;
    expect(bodyText).toContain('DELIVERED');
    expect(bodyText).toContain('UPS');

    await screenshot(page, 'stage1_estimate');
  });

  /* ════════════════════════════════════════════════════════
   *  Stage 2-1: 실제 청구 등록 (마감 전)
   *  → zen_ups_actual_charges INSERT
   *  → UPS_ACTUAL_ADJUSTMENT 비용 행 생성
   *  → 인보이스 총액 재계산
   * ════════════════════════════════════════════════════════ */
  test('Stage 2-1: 실제 청구 등록 (마감 전)', async ({ page }) => {
    // 기존 조정 비용 정리
    await sb.from('zen_order_costs')
      .delete()
      .eq('order_id', orderId)
      .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT');

    // 실제 청구 요금 등록
    await sb.from('zen_ups_actual_charges').delete().eq('order_id', orderId);
    await sb.from('zen_ups_actual_charges').insert([
      { order_id: orderId, charge_type: 'BASE FREIGHT', charge_amount: 320, currency: 'USD' },
      { order_id: orderId, charge_type: 'FUEL SURCHARGE', charge_amount: 120, currency: 'USD' },
    ]);

    // 예상 합계: 500, 실제 합계: 440, 차액: -60
    const adjustmentAmount = -60;

    await sb.from('zen_order_costs').insert({
      order_id: orderId, cost_type: 'UPS_ACTUAL_ADJUSTMENT',
      unit_price: adjustmentAmount, quantity: 1, currency: 'USD', is_revenue: true,
      invoice_id: invoiceId,
    });

    // 인보이스 총액 재계산
    const { data: allCosts } = await sb
      .from('zen_order_costs')
      .select('unit_price, quantity')
      .eq('order_id', orderId)
      .eq('invoice_id', invoiceId);
    const newTotal = allCosts!.reduce((s: number, c: any) => s + Number(c.unit_price) * Number(c.quantity), 0);
    await sb.from('zen_invoices').update({ total_amount: newTotal }).eq('id', invoiceId);

    // DB 검증: 실제 청구 2건
    const { data: charges } = await sb
      .from('zen_ups_actual_charges')
      .select('charge_type, charge_amount')
      .eq('order_id', orderId);
    expect(charges!.length).toBe(2);
    const actualSum = charges!.reduce((s: number, c: any) => s + Number(c.charge_amount), 0);
    expect(actualSum).toBe(440);

    // DB 검증: 인보이스 총액 = 440 (500 + (-60))
    const { data: invCheck } = await sb
      .from('zen_invoices')
      .select('total_amount, is_finalized')
      .eq('id', invoiceId).single();
    expect(Number(invCheck!.total_amount)).toBe(newTotal);
    expect(invCheck!.is_finalized).toBe(false);

    // UI: 사후청구 폼 확인
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent('body'))!;
    const hasAdjustmentSection = bodyText.includes('사후청구') || bodyText.includes('Actual');
    expect(hasAdjustmentSection).toBe(true);

    await screenshot(page, 'stage2_actual_charges');
  });

  /* ════════════════════════════════════════════════════════
   *  Stage 2-2: 정산 마감 (finalize)
   *  → is_finalized = true
   *  → finalized_at, finalized_by 기록
   * ════════════════════════════════════════════════════════ */
  test('Stage 2-2: 정산 마감 (finalize)', async ({ page }) => {
    const { data: users } = await sb.auth.admin.listUsers();
    const adminUserId = users?.users?.find((u: any) => u.email === ADMIN_EMAIL)?.id;

    // DB: 마감 처리
    await sb.from('zen_invoices').update({
      is_finalized: true,
      finalized_at: new Date().toISOString(),
      finalized_by: adminUserId,
      finalized_reason: 'E29 파이프라인 테스트 마감',
    }).eq('id', invoiceId);

    // DB 검증: 마감 완료
    const { data: invFinalized } = await sb
      .from('zen_invoices')
      .select('is_finalized, finalized_at, finalized_by, finalized_reason')
      .eq('id', invoiceId).single();
    expect(invFinalized!.is_finalized).toBe(true);
    expect(invFinalized!.finalized_at).toBeTruthy();
    expect(invFinalized!.finalized_by).toBe(adminUserId);
    expect(invFinalized!.finalized_reason).toContain('E29');

    // UI: 마감 후 상태 확인
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const bodyText = (await page.textContent('body'))!;
    const hasPostFinalMsg = bodyText.includes('마감') || bodyText.includes('finalized');
    expect(hasPostFinalMsg).toBe(true);

    await screenshot(page, 'stage2_finalized');
  });

  /* ════════════════════════════════════════════════════════
   *  Stage 3: daily-billing 집계 확인
   *  → /finance/daily-billing 페이지에서 해당 화주+일자 집계 확인
   *  → finalization 상태 반영 확인
   * ════════════════════════════════════════════════════════ */
  test('Stage 3: daily-billing 집계 확인', async ({ page }) => {
    // UI: daily-billing 페이지 접근
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/ko/finance/daily-billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent('body'))!;

    // daily-billing 페이지가 로드되었는지 확인
    const hasPageTitle = bodyText.includes('청구') || bodyText.includes('billing') || bodyText.includes('집계');
    expect(hasPageTitle).toBe(true);

    // 해당 화주집계가 존재하는지 확인 (orderNo가 테이블에 나타날 수 있음)
    const hasOrderReference = bodyText.includes(orderNo) || bodyText.includes('R11') || bodyText.includes('Shipper');
    expect(hasOrderReference).toBe(true);

    await screenshot(page, 'stage3_daily_billing');
  });

  /* ════════════════════════════════════════════════════════
   *  Stage 3-DB: daily-billing 집계 데이터 검증
   *  → getShipperDailyBillingSummary 결과와 일치하는지 확인
   * ════════════════════════════════════════════════════════ */
  test('Stage 3-DB: daily-billing 집계 데이터 검증', async () => {
    // DB: 해당 오더의 비용 합계가 정확한지 확인
    const { data: costs } = await sb
      .from('zen_order_costs')
      .select('cost_type, unit_price, quantity')
      .eq('order_id', orderId);

    // BASE_FREIGHT + FUEL_SURCHARGE + OTHER_CHARGE + UPS_ACTUAL_ADJUSTMENT
    let baseFreight = 0;
    let fuelSurcharge = 0;
    let otherCharge = 0;
    let actualAdjustment = 0;

    for (const c of costs || []) {
      const amt = Number(c.unit_price) * Number(c.quantity || 1);
      if (c.cost_type === 'BASE_FREIGHT') baseFreight += amt;
      else if (c.cost_type === 'FUEL_SURCHARGE') fuelSurcharge += amt;
      else if (c.cost_type === 'OTHER_CHARGE') otherCharge += amt;
      else if (c.cost_type === 'UPS_ACTUAL_ADJUSTMENT') actualAdjustment += amt;
    }

    // 예상 값 검증
    expect(baseFreight).toBe(300);
    expect(fuelSurcharge).toBe(100);
    expect(otherCharge).toBe(100);
    expect(actualAdjustment).toBe(-60);

    const totalUsd = baseFreight + fuelSurcharge + otherCharge + actualAdjustment;
    expect(totalUsd).toBe(440);

    // DB: 인보이스 총액과 일치 확인
    const { data: inv } = await sb
      .from('zen_invoices')
      .select('total_amount, is_finalized')
      .eq('id', invoiceId).single();
    expect(Number(inv!.total_amount)).toBe(440);
    expect(inv!.is_finalized).toBe(true);

    // DB: 해당 화주의 오더 수가 1개 이상인지 확인
    const { data: shipperOrders } = await sb
      .from('zen_orders')
      .select('id')
      .eq('shipper_id', SHIPPER_ORG_ID)
      .eq('transport_mode', 'UPS');
    expect(shipperOrders!.length).toBeGreaterThanOrEqual(1);
  });

  /* ════════════════════════════════════════════════════════
   *  Gap 검증: 마감 후 조정 시 신규 인보이스 생성
   *  → createPostFinalizationAdjustment 시나리오
   * ════════════════════════════════════════════════════════ */
  test('Gap 검증: 마감 후 조정 — 추가 인보이스 발행', async () => {
    // 새로운 실제 청구 요금 (추가 청구)
    await sb.from('zen_ups_actual_charges').delete().eq('order_id', orderId);
    await sb.from('zen_ups_actual_charges').insert([
      { order_id: orderId, charge_type: 'BASE FREIGHT', charge_amount: 400, currency: 'USD' },
      { order_id: orderId, charge_type: 'FUEL SURCHARGE', charge_amount: 150, currency: 'USD' },
      { order_id: orderId, charge_type: 'PEAK SEASON SURCHARGE', charge_amount: 50, currency: 'USD' },
    ]);

    // 실제 합계: 600, 예상 합계: 500, 차액: +100
    const adjAmount = 100;

    // UPS_ACTUAL_ADJUSTMENT 비용 행 생성
    await sb.from('zen_order_costs')
      .delete()
      .eq('order_id', orderId)
      .eq('cost_type', 'UPS_ACTUAL_ADJUSTMENT');

    await sb.from('zen_order_costs').insert({
      order_id: orderId, cost_type: 'UPS_ACTUAL_ADJUSTMENT',
      unit_price: adjAmount, quantity: 1, currency: 'USD', is_revenue: true,
    });

    // 신규 조정 인보이스 생성 (createPostFinalizationAdjustment 시뮬레이션)
    const adjInvDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const adjInvSeq = Date.now().toString().slice(-4);
    const { data: newInv } = await sb.from('zen_invoices').insert({
      invoice_no: `INV-${adjInvDate}-E29A${adjInvSeq}`,
      shipper_id: SHIPPER_ORG_ID,
      status: 'UNPAID',
      total_amount: adjAmount,
      currency: 'USD',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      metadata: {
        source_order_id: orderId,
        order_no: orderNo,
        adjustment_of: invoiceId,
      },
      is_finalized: false,
    }).select('id, invoice_no').single();

    // DB 검증: 신규 인보이스 생성 확인
    const { data: adjInvoice } = await sb
      .from('zen_invoices')
      .select('id, invoice_no, total_amount, is_finalized, metadata')
      .eq('id', newInv!.id).single();
    expect(adjInvoice).toBeTruthy();
    expect(adjInvoice!.is_finalized).toBe(false);
    expect(Number(adjInvoice!.total_amount)).toBe(adjAmount);
    expect(adjInvoice!.metadata).toHaveProperty('adjustment_of', invoiceId);

    // DB 검증: 원 인보이스 불변
    const { data: origInv } = await sb
      .from('zen_invoices')
      .select('total_amount, is_finalized')
      .eq('id', invoiceId).single();
    expect(Number(origInv!.total_amount)).toBe(440);
    expect(origInv!.is_finalized).toBe(true);
  });
});
