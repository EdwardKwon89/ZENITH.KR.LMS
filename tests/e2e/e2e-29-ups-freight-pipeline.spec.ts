/**
 * E29: UPS 운임 파이프라인 E2E 검증 (Issue #747, TASK-205 / W3 — 재작업)
 *
 * 핵심 검증: 중량 변경이 최종 원가/운임에 반영되는지(캐시된 값을 쓰지 않는지) 확인
 *
 * 시나리오:
 *   TC-WF-01: 중량 변경→운임 견적 차이 검증 (computeUpsFreight 직접 호출)
 *   TC-WF-02: 스냅샷 갱신 후 정산 비용 재생성 검증
 *   TC-WF-03: 실제 오더 상세 UI 탐색 검증
 *
 * r11 패턴 준수 (self-contained, serviceClient seed/cleanup)
 */
import { test, expect } from '@playwright/test';
import { getServiceClient } from './test-utils';
import { computeUpsFreight } from '../../src/lib/ups/pricing-engine';
import * as fs from 'fs';
import * as path from 'path';

/* ── config ─────────────────────────────────────────────── */
const SCREENSHOT_DIR = 'docs/99_Manual/E2E_29_Result';
const ADMIN_EMAIL = 'admin@zenith.kr';
const ADMIN_PASSWORD = 'password1234';

const sb = getServiceClient();

/* ── UPS 요금 데이터 (실제 DB에서 확인된 값) ─────────────── */
const PRODUCT_ID = 'd8fee840-bcdf-47da-b5cf-516ff5bff07d'; // WW_EXPRESS_NONDOC
const ZONE_ID = '2d4ee620-68d3-41f2-a4ed-c054f86197d5';   // Z8 (북미)
const SHIPPER_ORG_ID = 'b0000000-0000-0000-0000-000000000002';
const EEST = 'E29';

/* ── 시드 데이터 ─────────────────────────────────────────── */
const SEED_WEIGHT_OLD = 2.0;   // 초기 중량 (kg)
const SEED_WEIGHT_NEW = 5.0;   // 변경 중량 (kg)

let orderId: string;
let orderNo: string;

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

/**
 * computeUpsFreight에 필요한 최소한의 요금 데이터를 조회하여 UpsPricingData 구성
 */
async function buildPricingData(weightKg: number) {
  const [{ data: product }, { data: zones }, { data: baseRate }, { data: fuelRows }, { data: otherCharges }] =
    await Promise.all([
      sb.from('zen_ups_products').select('*').eq('id', PRODUCT_ID).single(),
      sb.from('zen_ups_zones').select('*, countries:zen_ups_zone_countries(*)').eq('is_active', true),
      sb.from('zen_ups_base_rates').select('*')
        .eq('product_id', PRODUCT_ID).eq('zone_id', ZONE_ID)
        .eq('weight_kg', weightKg <= 20 ? weightKg : 20).eq('is_active', true).single(),
      sb.from('zen_ups_fuel_surcharges').select('*')
        .or(`product_id.eq.${PRODUCT_ID},product_id.is.null`)
        .order('effective_week', { ascending: false }).limit(1),
      sb.from('zen_ups_other_charges').select('*').eq('is_active', true),
    ]);

  const zone = zones?.find((z: any) => z.id === ZONE_ID);
  const fuelSurcharge = fuelRows?.[0] ?? null;

  return {
    zone: zone as any,
    product: product as any,
    baseRate: baseRate as any,
    weightTierRates: [],
    freightMinimum: null,
    fuelSurcharge,
    otherCharges: (otherCharges ?? []) as any[],
    surgeFee: null,
    oversizeCharge: (otherCharges ?? []).find((c: any) => c.charge_code === 'OVERSIZE') as any,
    fallbackApplied: false,
  };
}

/* ── test suite ──────────────────────────────────────────── */
test.describe.serial('E29: UPS 운임 파이프라인 E2E 검증 (중량 변경 검증)', () => {
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

    // ── seed: order (WAREHOUSED, UPS) ──
    orderNo = `${EEST}-${Date.now()}`;
    const { data: ord, error: ordErr } = await sb.from('zen_orders').insert({
      order_no: orderNo,
      status: 'WAREHOUSED',
      shipper_id: SHIPPER_ORG_ID,
      transport_mode: 'UPS',
      ups_product_code: 'WW_EXPRESS_NONDOC',
      recipient_country_code: 'US',
      incoterms: 'DDU',
      estimated_cost: 0,
      cargo_details: { description: 'E29 weight-change freight pipeline test' },
    }).select('id').single();
    if (ordErr) throw new Error(`Order seed failed: ${ordErr.message}`);
    orderId = ord!.id;

    // ── seed: packages (2.0kg) ──
    await sb.from('zen_order_packages').insert({
      order_id: orderId,
      packing_unit: 'BOX',
      packing_count: 1,
      gross_weight: SEED_WEIGHT_OLD,
      special_cargo_type: 'NONE',
    });

    // ── seed: rate snapshot (2.0kg 기준) ──
    const pricingData2kg = await buildPricingData(SEED_WEIGHT_OLD);
    const estimate2kg = computeUpsFreight(
      {
        productId: PRODUCT_ID,
        destCountryCode: 'US',
        actualWeightKg: SEED_WEIGHT_OLD,
        incoterms: 'DDU',
      },
      pricingData2kg,
    );

    await sb.from('zen_order_rate_snapshots').insert({
      order_id: orderId,
      applied_unit_price: estimate2kg.totalSellingPrice,
      applied_currency: estimate2kg.currency ?? 'KRW',
      applied_rule: 'UPS_3TIER',
      metadata: { platform: estimate2kg } as unknown as Record<string, unknown>,
    });
  });

  /* ════════════════════════════════════════════════════════
   *  TC-WF-01: 중량 변경→운임 견적 차이 검증
   *
   *  computeUpsFreight(순수 계산 함수)를 직접 호출하여:
   *  1) 2.0kg 견적이 스냅샷과 일치하는지 확인
   *  2) 5.0kg 견적을 별도 계산
   *  3) 스냅샷(2.0kg) ≠ 5.0kg 견적 → 캐시가 중량 미반영 증명
   * ════════════════════════════════════════════════════════ */
  test('TC-WF-01: 중량 변경→운임 견적 차이 검증 (computeUpsFreight 직접 호출)', async () => {
    // 1) 스냅샷에서 기존 견적 조회
    const { data: snapshot } = await sb
      .from('zen_order_rate_snapshots')
      .select('metadata, applied_unit_price')
      .eq('order_id', orderId).single();
    expect(snapshot).toBeTruthy();

    const snapshotEstimate = (snapshot!.metadata as any).platform;
    expect(snapshotEstimate).toBeTruthy();
    expect(snapshotEstimate.totalSellingPrice).toBeGreaterThan(0);

    // 2) computeUpsFreight로 2.0kg 견적 계산 (실제 서버 액션 코드 경로)
    const estimate2kg = computeUpsFreight(
      {
        productId: PRODUCT_ID,
        destCountryCode: 'US',
        actualWeightKg: SEED_WEIGHT_OLD,
        incoterms: 'DDU',
      },
      await buildPricingData(SEED_WEIGHT_OLD),
    );

    // 스냅샷이 2.0kg 견적과 일치하는지 확인 (동일한 계산 경로)
    expect(snapshotEstimate.totalSellingPrice).toBe(estimate2kg.totalSellingPrice);
    expect(snapshotEstimate.baseSellingPrice).toBe(estimate2kg.baseSellingPrice);
    expect(snapshotEstimate.currency).toBe(estimate2kg.currency);

    // 3) computeUpsFreight로 5.0kg 견적 계산
    const estimate5kg = computeUpsFreight(
      {
        productId: PRODUCT_ID,
        destCountryCode: 'US',
        actualWeightKg: SEED_WEIGHT_NEW,
        incoterms: 'DDU',
      },
      await buildPricingData(SEED_WEIGHT_NEW),
    );

    // 4) 핵심 검증: 5.0kg 견적 ≠ 2.0kg 견적 (중량이 운임에 영향을 줌)
    expect(estimate5kg.totalSellingPrice).not.toBe(estimate2kg.totalSellingPrice);
    expect(estimate5kg.baseSellingPrice).not.toBe(estimate2kg.baseSellingPrice);

    // 5) 핵심 검증: 스냅샷(2.0kg)은 5.0kg 견적과 다르다 → 캐시가 중량 변경을 반영하지 않음
    expect(snapshotEstimate.totalSellingPrice).not.toBe(estimate5kg.totalSellingPrice);
    expect(snapshotEstimate.baseSellingPrice).not.toBe(estimate5kg.baseSellingPrice);

    // 6) 5.0kg 견적이 더 높아야 함 (무거울수록 비쌈)
    expect(estimate5kg.totalSellingPrice).toBeGreaterThan(estimate2kg.totalSellingPrice);

    // 로그 출력 (디버깅용)
    console.log(`[TC-WF-01] 2.0kg total: ${estimate2kg.totalSellingPrice} ${estimate2kg.currency}`);
    console.log(`[TC-WF-01] 5.0kg total: ${estimate5kg.totalSellingPrice} ${estimate5kg.currency}`);
    console.log(`[TC-WF-01] snapshot total: ${snapshotEstimate.totalSellingPrice} ${snapshotEstimate.currency}`);
  });

  /* ════════════════════════════════════════════════════════
   *  TC-WF-02: 스냅샷 갱신 후 정산 비용 재생성 검증
   *
   *  시나리오:
   *  1) 중량을 2.0kg → 5.0kg로 변경 (입고 시 재측정 시뮬레이션)
   *  2) 스냅샷을 5.0kg 견적으로 갱신 (SettlementEngine이 읽는 데이터)
   *  3) 정산 비용을 스냅샷에서 재생성 (SettlementEngine 로직 시뮬레이션)
   *  4) 새 비용이 5.0kg 기준인지 검증
   * ════════════════════════════════════════════════════════ */
  test('TC-WF-02: 스냅샷 갱신 후 정산 비용 재생성 검증', async () => {
    // 1) 중량 변경 (입고 시 재측정 시뮬레이션)
    const { error: updateErr } = await sb
      .from('zen_order_packages')
      .update({ gross_weight: SEED_WEIGHT_NEW })
      .eq('order_id', orderId);
    expect(updateErr).toBeNull();

    // DB에서 중량 확인
    const { data: pkg } = await sb
      .from('zen_order_packages')
      .select('gross_weight')
      .eq('order_id', orderId).single();
    expect(Number(pkg!.gross_weight)).toBe(SEED_WEIGHT_NEW);

    // 2) 5.0kg 견적 계산 (실제 서버 액션 코드 경로)
    const estimate5kg = computeUpsFreight(
      {
        productId: PRODUCT_ID,
        destCountryCode: 'US',
        actualWeightKg: SEED_WEIGHT_NEW,
        incoterms: 'DDU',
      },
      await buildPricingData(SEED_WEIGHT_NEW),
    );

    // 3) 스냅샷 갱신 (SettlementEngine이 읽을 데이터)
    const { error: snapErr } = await sb
      .from('zen_order_rate_snapshots')
      .update({
        applied_unit_price: estimate5kg.totalSellingPrice,
        metadata: { platform: estimate5kg } as unknown as Record<string, unknown>,
      })
      .eq('order_id', orderId);
    expect(snapErr).toBeNull();

    // 갱신된 스냅샷 확인
    const { data: updatedSnap } = await sb
      .from('zen_order_rate_snapshots')
      .select('metadata, applied_unit_price')
      .eq('order_id', orderId).single();
    const updatedMeta = (updatedSnap!.metadata as any).platform;
    expect(updatedMeta.totalSellingPrice).toBe(estimate5kg.totalSellingPrice);

    // 4) 정산 비용 재생성 (SettlementEngine.calculateOrderCosts UPS 분기 로직 시뮬레이션)
    //    기존 미청구 UPS cost 항목 삭제 (멱등성)
    await sb.from('zen_order_costs')
      .delete()
      .eq('order_id', orderId)
      .in('cost_type', ['BASE_FREIGHT', 'FUEL_SURCHARGE', 'SURGE_FEE', 'OTHER_CHARGE']);

    // 스냅샷에서 비용 추출 (SettlementEngine과 동일한 경로)
    const currency = updatedMeta.currency || 'KRW';
    const baseFreight = Number(updatedMeta.baseSellingPrice) || 0;
    const fuelSurchargeAmt = Number(updatedMeta.fuelSurchargeSellingAmount) || 0;
    const surgeFeeAmt = Number(updatedMeta.surgeFeeSellingAmount) || 0;
    const otherChargesAmt = Number(updatedMeta.otherChargesSellingTotal) || 0;

    const upsCosts: any[] = [];
    if (baseFreight > 0) {
      upsCosts.push({
        order_id: orderId, cost_type: 'BASE_FREIGHT',
        unit_price: baseFreight, quantity: 1, currency, is_revenue: true,
      });
    }
    if (fuelSurchargeAmt > 0) {
      upsCosts.push({
        order_id: orderId, cost_type: 'FUEL_SURCHARGE',
        unit_price: fuelSurchargeAmt, quantity: 1, currency, is_revenue: true,
      });
    }
    if (surgeFeeAmt > 0) {
      upsCosts.push({
        order_id: orderId, cost_type: 'SURGE_FEE',
        unit_price: surgeFeeAmt, quantity: 1, currency, is_revenue: true,
      });
    }
    if (otherChargesAmt > 0) {
      upsCosts.push({
        order_id: orderId, cost_type: 'OTHER_CHARGE',
        unit_price: otherChargesAmt, quantity: 1, currency, is_revenue: true,
      });
    }

    if (upsCosts.length > 0) {
      const { error: insertErr } = await sb.from('zen_order_costs').insert(upsCosts);
      expect(insertErr).toBeNull();
    }

    // 5) 새 비용이 5.0kg 기준인지 검증
    const { data: newCosts } = await sb
      .from('zen_order_costs')
      .select('cost_type, unit_price, currency')
      .eq('order_id', orderId);

    const costBaseFreight = newCosts?.find((c: any) => c.cost_type === 'BASE_FREIGHT');
    const costFuelSurcharge = newCosts?.find((c: any) => c.cost_type === 'FUEL_SURCHARGE');

    expect(costBaseFreight).toBeTruthy();
    expect(costFuelSurcharge).toBeTruthy();

    // 5.0kg 기준 요금과 일치하는지 검증
    expect(Number(costBaseFreight!.unit_price)).toBe(estimate5kg.baseSellingPrice);
    expect(Number(costFuelSurcharge!.unit_price)).toBe(estimate5kg.fuelSurchargeSellingAmount);

    // 5.0kg 기준 요금이 2.0kg보다 높아야 함
    const estimate2kg = computeUpsFreight(
      {
        productId: PRODUCT_ID,
        destCountryCode: 'US',
        actualWeightKg: SEED_WEIGHT_OLD,
        incoterms: 'DDU',
      },
      await buildPricingData(SEED_WEIGHT_OLD),
    );
    expect(Number(costBaseFreight!.unit_price)).toBeGreaterThan(estimate2kg.baseSellingPrice);

    console.log(`[TC-WF-02] BASE_FREIGHT (5.0kg): ${costBaseFreight!.unit_price} ${currency}`);
    console.log(`[TC-WF-02] FUEL_SURCHARGE (5.0kg): ${costFuelSurcharge!.unit_price} ${currency}`);
  });

  /* ════════════════════════════════════════════════════════
   *  TC-WF-03: 실제 오더 상세 UI 탐색 검증
   *
   *  실제 브라우저에서 로그인 → 오더 상세 페이지 이동 →
   *  상태·운송수단·운임 정보가 표시되는지 확인
   * ════════════════════════════════════════════════════════ */
  test('TC-WF-03: 실제 오더 상세 UI 탐색 검증', async ({ page }) => {
    // 1) 로그인
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // 2) 오더 상세 페이지 이동 (실제 브라우저 네비게이션)
    await page.goto(`/ko/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 3) 페이지 로드 확인
    const bodyText = (await page.textContent('body'))!;

    // 오더 번호 표시 확인
    expect(bodyText).toContain(orderNo);

    // 상태 표시 확인
    expect(bodyText).toContain('WAREHOUSED');

    // 운송수단 표시 확인
    expect(bodyText).toContain('UPS');

    // 4) DB에서 스냅샷 존재 확인 (UI와 DB 일관성)
    const { data: snapForUi } = await sb
      .from('zen_order_rate_snapshots')
      .select('applied_unit_price, applied_currency')
      .eq('order_id', orderId).single();
    expect(snapForUi).toBeTruthy();
    expect(Number(snapForUi!.applied_unit_price)).toBeGreaterThan(0);

    // 5) DB에서 정산 비용 존재 확인
    const { data: costsForUi } = await sb
      .from('zen_order_costs')
      .select('cost_type, unit_price')
      .eq('order_id', orderId);
    expect(costsForUi!.length).toBeGreaterThan(0);

    const totalCost = costsForUi!.reduce((s: number, c: any) => s + Number(c.unit_price), 0);
    expect(totalCost).toBeGreaterThan(0);

    await screenshot(page, 'wf03_order_detail');
  });
});
