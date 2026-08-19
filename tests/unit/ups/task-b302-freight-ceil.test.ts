// TASK-B-302 (Issue #1123): UPS 운임 계산 전체 올림(Ceiling) 정책 회귀 테스트.
//
// JSJung 확정 정책: "UPS 모든 운임 표출은 올림으로 표출합니다"
// 1. 올림 단위: KRW 정수(원), USD 소수점 2자리(센트)
// 2. 적용 범위: 화면 표시뿐 아니라 저장값(계산 로직) 자체
// 3. 기존 오더는 소급 미적용 (이 작업 이후 신규 계산부터만)
//
// 검증:
//  TC-CEIL-01: ceilByCurrency 단위 — KRW 정수 올림 / USD 센트 올림 / 나누어떨어지는 값 원값 유지
//  TC-CEIL-02: computeUpsFreight 라인 항목 개별 올림 + 합계 정합성 (ZEN-2026-000073 파라미터 재현)
//  TC-CEIL-03: fuelSurchargeSellingAmount(result) === breakdown.fuelSurchargeSellingAmount (buildBreakdown 정합성)
//  TC-CEIL-04: 원가(totalCostPrice 등)는 올림 미적용 (범위 밖 회귀 방지)
//  TC-CEIL-05: USD 오더 케이스 — 센트 단위 올림 정확성
//  TC-CEIL-06: computeAgencyFreight 할인율 적용 시 통화별 올림
//  TC-CEIL-07: computeShipperFreight 할인율 적용 시 통화별 올림
import { describe, it, expect } from 'vitest';
import {
  ceilByCurrency,
  computeUpsFreight,
  UPS_COST_SURCHARGE_RATE,
} from '@/lib/ups/pricing-engine';
import { computeAgencyFreight } from '@/lib/ups/agency-pricing';
import { computeShipperFreight } from '@/lib/ups/shipper-pricing';
import type { UpsPricingData, UpsFreightInput, UpsOtherCharge } from '@/types/ups';

const baseData = (overrides: Partial<UpsPricingData> = {}): UpsPricingData => ({
  zone: { id: 'z1', zone_code: 'Z8', zone_name: 'North America', description: null, is_active: true, sort_order: 8, created_at: '', created_by: null } as any,
  product: { id: 'p1', product_code: 'WW_SAVER_NONDOC', sub_code: null, product_name: 'Saver', cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '' } as any,
  baseRate: { id: 'r1', product_id: 'p1', zone_id: 'z1', weight_kg: 5, selling_price: 355100, cost_price: 290000, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null } as any,
  fuelSurcharge: { id: 'f1', product_id: null, effective_week: '2026-08-10', selling_rate: 0.4675, cost_rate: 0.4, created_at: '', created_by: null } as any,
  otherCharges: [],
  weightTierRates: [],
  freightMinimum: null,
  ...overrides,
});

const baseInput = (overrides: Partial<UpsFreightInput> = {}): UpsFreightInput => ({
  productId: 'p1',
  destCountryCode: 'USA',
  actualWeightKg: 5,
  ...overrides,
});

describe('TASK-B-302 (Issue #1123): ceilByCurrency 단위 검증', () => {
  it('TC-CEIL-01a: KRW는 정수(원) 단위로 올림된다', () => {
    expect(ceilByCurrency(355100.01, 'KRW')).toBe(355101);
    expect(ceilByCurrency(0.5, 'KRW')).toBe(1);
    expect(ceilByCurrency(100.0001, 'KRW')).toBe(101);
  });

  it('TC-CEIL-01b: USD는 소수점 2자리(센트) 단위로 올림된다', () => {
    expect(ceilByCurrency(10.001, 'USD')).toBe(10.01);
    expect(ceilByCurrency(10.0099, 'USD')).toBe(10.01);
    expect(ceilByCurrency(10.011, 'USD')).toBe(10.02);
  });

  it('TC-CEIL-01c: 정확히 나누어떨어지는 값은 원값 유지 (불필요한 +1 없음)', () => {
    expect(ceilByCurrency(355100, 'KRW')).toBe(355100);
    expect(ceilByCurrency(10.01, 'USD')).toBe(10.01);
    expect(ceilByCurrency(0, 'KRW')).toBe(0);
  });
});

describe('TASK-B-302 (Issue #1123): computeUpsFreight 올림 정합성', () => {
  it('TC-CEIL-02: 라인 항목 개별 올림 후 합계가 정확히 일치한다 (ZEN-2026-000073 재현: base 355100, fuel 46.75%)', () => {
    const result = computeUpsFreight(baseInput(), baseData());
    // baseSellingPrice 355100 (정수 원래값), fuelSellAmt = ceil(355100*0.4675) = ceil(166009.25) = 166010
    expect(result.baseSellingPrice).toBe(355100);
    expect(result.fuelSurchargeSellingAmount).toBe(166010);
    expect(result.otherChargesSellingTotal).toBe(0);
    expect(result.surgeFeeSellingAmount).toBe(0);
    // 합계 = 정수 355100 + 정수 166010 = 521110 (검산 정합성 — 사용자가 직접 검산 가능)
    expect(result.totalSellingPrice).toBe(521110);
    expect(result.totalSellingPrice).toBe(
      result.baseSellingPrice
        + result.fuelSurchargeSellingAmount
        + result.otherChargesSellingTotal
        + result.surgeFeeSellingAmount
    );
    // breakdown의 baseSellingPrice도 동일 올림값
    expect(result.breakdown.baseSellingPrice).toBe(355100);
  });

  it('TC-CEIL-03: fuelSurchargeSellingAmount(result) === breakdown.fuelSurchargeSellingAmount (buildBreakdown 정합성)', () => {
    const result = computeUpsFreight(baseInput(), baseData());
    expect(result.fuelSurchargeSellingAmount).toBe(result.breakdown.fuelSurchargeSellingAmount);
  });

  it('TC-CEIL-03r: buildBreakdown이 fuelSellAmt를 파라미터로 재사용한다 (독립 재계산 시 divergence 버그 재현 회귀)', () => {
    // fuelRate(46.75%)로 올림된 fuelSellAmt(166010)가 breakdown에도 그대로 전달되어야 한다.
    // 만약 buildBreakdown이 baseSellingPrice * fuelRate를 독립 재계산하면(166009.25) 두 값이 달라진다.
    const result = computeUpsFreight(baseInput(), baseData());
    expect(result.breakdown.fuelSurchargeSellingAmount).toBe(166010);
    expect(result.breakdown.fuelSurchargeSellingAmount).toBe(result.fuelSurchargeSellingAmount);
  });

  it('TC-CEIL-03b: 기타 부가요금이 있는 경우에도 개별 항목 합 === sellingTotal', () => {
    const extraCharge: UpsOtherCharge = {
      id: 'oc1', charge_code: 'OVERSIZE', charge_name: 'Oversize', unit: 'PKG',
      fuel_surcharge_applicable: true, selling_price: 69200, cost_price: 55000, currency: 'KRW',
      is_active: true, created_at: '', created_by: null,
    } as any;
    const result = computeUpsFreight(baseInput(), baseData({ otherCharges: [extraCharge] }));
    // charge selling = ceil(69200 + 69200*0.4675) = ceil(69200 + 32351) = ceil(101551) = 101551
    expect(result.otherChargesSellingTotal).toBe(101551);
    // sum of displayed items == sellingTotal (각 item.sellingBase + fuelSurchargeSelling 합)
    const itemSum = result.breakdown.otherChargeItems.reduce(
      (s, it) => s + it.sellingBase + it.fuelSurchargeSelling, 0
    );
    expect(result.otherChargesSellingTotal).toBe(Math.ceil(itemSum));
    // 총합 정합성
    expect(result.totalSellingPrice).toBe(
      result.baseSellingPrice
        + result.fuelSurchargeSellingAmount
        + result.otherChargesSellingTotal
        + result.surgeFeeSellingAmount
    );
  });

  it('TC-CEIL-04: 원가(totalCostPrice 등)는 올림 미적용 — 범위 밖 항목 회귀 방지', () => {
    const result = computeUpsFreight(baseInput(), baseData());
    // baseCost = 290000 * 1.07 = 310300 (정수라 변경 없음), fuelCost = 310300*0.4 = 124120
    expect(result.baseCostPrice).toBeCloseTo(290000 * (1 + UPS_COST_SURCHARGE_RATE), 2);
    expect(result.fuelSurchargeCostAmount).toBeCloseTo(
      290000 * (1 + UPS_COST_SURCHARGE_RATE) * 0.4, 2
    );
    // 원가가 소수점을 가질 수 있는 경우에도 올림되지 않아야 함 (예: 소수 원가 비율)
    // fuelCostRate 0.333333 → 소수점 유지 확인
    const frac = computeUpsFreight(
      baseInput(),
      baseData({ fuelSurcharge: { ...baseData().fuelSurcharge!, selling_rate: 0.333333, cost_rate: 0.333333 } as any })
    );
    expect(frac.fuelSurchargeCostAmount % 1).not.toBe(0);
  });

  it('TC-CEIL-05: USD 오더 케이스 — 센트 단위 올림 정확성', () => {
    const usdData = baseData({
      baseRate: { id: 'r-usd', product_id: 'p1', zone_id: 'z1', weight_kg: 5, selling_price: 100.005, cost_price: 80, currency: 'USD', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null } as any,
      fuelSurcharge: { id: 'f-usd', product_id: null, effective_week: '2026-08-10', selling_rate: 0.185, cost_rate: 0.155, created_at: '', created_by: null } as any,
    });
    const result = computeUpsFreight(baseInput(), usdData);
    // baseSellingPrice = ceil(100.005) = 100.01 (센트 올림)
    expect(result.baseSellingPrice).toBe(100.01);
    expect(result.currency).toBe('USD');
    // fuelSell = ceil(100.01 * 0.185) = ceil(18.50185) = 18.51
    expect(result.fuelSurchargeSellingAmount).toBe(18.51);
    // totalSellingPrice = 100.01 + 18.51 = 118.52 (2자리 보장)
    expect(result.totalSellingPrice).toBe(118.52);
    // 합계 정합성 — raw sum은 IEEE float 드리프트(118.52000000000001)로 ceilByCurrency가 정규화
    expect(result.totalSellingPrice).toBeCloseTo(
      result.baseSellingPrice
        + result.fuelSurchargeSellingAmount
        + result.otherChargesSellingTotal
        + result.surgeFeeSellingAmount,
      9
    );
  });
});

describe('TASK-B-302 (Issue #1123): Agency/Shipper 단계 통화별 올림', () => {
  it('TC-CEIL-06: computeAgencyFreight 할인율 적용 시 KRW 정수 올림', () => {
    // discountedBase = ceil(355100 * (1-0.15)) = ceil(301835) = 301835
    // passthrough = 166010 + 0 + 0 = 166010
    // agencySellingPrice = ceil(301835 + 166010 + 3000) = ceil(470845) = 470845
    const result = computeAgencyFreight({
      baseSellingPrice: 355100,
      fuelSurchargeSellingAmount: 166010,
      otherChargesSellingTotal: 0,
      surgeFeeSellingAmount: 0,
      discountRate: 0.15,
      agencyOtherCharges: [{ sellingPrice: 3000, costPrice: 2000 }],
      currency: 'KRW',
    });
    expect(result.baseSellingPrice).toBe(301835);
    expect(result.agencySellingPrice).toBe(470845);
    expect(result.agencyCostPrice).toBe(469845);
  });

  it('TC-CEIL-06b: computeAgencyFreight USD 센트 올림', () => {
    // discountedBase = ceil(100.01 * (1-0.15)) = ceil(85.0085) = 85.01
    const result = computeAgencyFreight({
      baseSellingPrice: 100.01,
      fuelSurchargeSellingAmount: 18.51,
      otherChargesSellingTotal: 0,
      surgeFeeSellingAmount: 0,
      discountRate: 0.15,
      agencyOtherCharges: [],
      currency: 'USD',
    });
    expect(result.baseSellingPrice).toBe(85.01);
    // agencySellingPrice = ceil(85.01 + 18.51) = 103.52
    expect(result.agencySellingPrice).toBe(103.52);
  });

  it('TC-CEIL-07: computeShipperFreight 할인율 적용 시 KRW 정수 올림', () => {
    // discountedBase = ceil(355100 * 0.95) = ceil(337345) = 337345
    // finalFreight = ceil(337345 + 166010 + 0 + 0) = 503355
    const result = computeShipperFreight(355100, 166010, 0, 0.05, 0, 'KRW');
    expect(result.baseSellingPrice).toBe(337345);
    expect(result.finalFreight).toBe(503355);
  });

  it('TC-CEIL-07b: computeShipperFreight USD 센트 올림', () => {
    // discountedBase = ceil(100.01 * 0.95) = ceil(95.0095) = 95.01
    const result = computeShipperFreight(100.01, 18.51, 0, 0.05, 0, 'USD');
    expect(result.baseSellingPrice).toBe(95.01);
    expect(result.finalFreight).toBe(113.52);
  });
});
