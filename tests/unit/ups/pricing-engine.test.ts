// Phase 7.1 TASK-173 IMP-145 (R-09 회귀 테스트 신규 추가) — An-14 §4
import { describe, it, expect } from 'vitest';
import {
  ceilToHalfKg,
  calcChargeableWeight,
  isOversizePackage,
  applyOversizeRule,
  computeUpsFreight,
  UPS_COST_SURCHARGE_RATE,
} from '@/lib/ups/pricing-engine';
import { computeAgencyFreight } from '@/lib/ups/agency-pricing';
import { computeShipperFreight } from '@/lib/ups/shipper-pricing';
import type { UpsPricingData, UpsFreightInput, UpsOtherCharge } from '@/types/ups';

const baseData = (): UpsPricingData => ({
  zone: { id: 'z1', zone_code: 'Z8', zone_name: 'North America', description: null, is_active: true, sort_order: 8, created_at: '', created_by: null } as any,
  product: { id: 'p1', product_code: 'WW_EXPRESS_NONDOC', sub_code: null, product_name: 'Express', cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '' } as any,
  baseRate: { id: 'r1', product_id: 'p1', zone_id: 'z1', weight_kg: 5, selling_price: 85000, cost_price: 68000, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null } as any,
  fuelSurcharge: { id: 'f1', product_id: null, effective_week: '2026-06-29', selling_rate: 0.185, cost_rate: 0.155, created_at: '', created_by: null } as any,
  otherCharges: [],
});

const baseInput = (): UpsFreightInput => ({
  productId: 'p1',
  destCountryCode: 'USA',
  actualWeightKg: 5,
});

describe('TC-UPS-ENGINE-01: 청구중량 계산', () => {
  it('0.5kg 단위로 올림 처리한다', () => {
    expect(ceilToHalfKg(4.1)).toBe(4.5);
    expect(ceilToHalfKg(4.5)).toBe(4.5);
  });

  it('실중량과 부피중량 중 큰 값을 청구중량으로 사용한다', () => {
    const { chargeableKg } = calcChargeableWeight(5, { l: 60, w: 50, h: 40 }, 5000);
    // 부피중량 = 60*50*40/5000 = 24kg > 실중량 5kg
    expect(chargeableKg).toBe(24);
  });
});

describe('TC-UPS-ENGINE-02: 원가 +7% 반영 (An-14 §0-1 A1)', () => {
  it('totalCostPrice 산출 시 base_rate.cost_price에 1.07을 곱한다', () => {
    const result = computeUpsFreight(baseInput(), baseData());
    expect(result.baseCostPrice).toBeCloseTo(68000 * (1 + UPS_COST_SURCHARGE_RATE), 2);
    expect(result.breakdown.costSurchargeRate).toBe(UPS_COST_SURCHARGE_RATE);
  });

  it('유류할증 원가도 +7% 반영된 base_c 기준으로 계산된다', () => {
    const result = computeUpsFreight(baseInput(), baseData());
    const expectedBaseC = 68000 * 1.07;
    expect(result.fuelSurchargeCostAmount).toBeCloseTo(expectedBaseC * 0.155, 2);
  });
});

describe('TC-UPS-ENGINE-03: 대형포장물(OVERSIZE) 특수 판정 (An-14 §0-1 C)', () => {
  const oversizeCharge: UpsOtherCharge = {
    id: 'oc-oversize', charge_code: 'OVERSIZE', charge_name: 'Oversize', unit: 'PKG',
    fuel_surcharge_applicable: true, selling_price: 69200, cost_price: 55000, currency: 'KRW',
    is_active: true, created_at: '', created_by: null,
  } as any;

  it('길이+둘레가 300cm 이하면 대형포장물 아님', () => {
    // l=50, w=50, h=50 -> 50 + 2*(50+50) = 250
    expect(isOversizePackage({ l: 50, w: 50, h: 50 })).toBe(false);
  });

  it('길이+둘레가 300~400cm 사이면 대형포장물로 판정한다', () => {
    // l=150, w=50, h=50 -> 150 + 2*(50+50) = 350
    expect(isOversizePackage({ l: 150, w: 50, h: 50 })).toBe(true);
  });

  it('400cm 초과면 대형포장물 특수룰 대상이 아니다(UPS 접수 불가 영역)', () => {
    // l=250, w=80, h=80 -> 250 + 2*(80+80) = 570
    expect(isOversizePackage({ l: 250, w: 80, h: 80 })).toBe(false);
  });

  it('대형포장물 판정 시 최소청구중량 40kg을 강제한다', () => {
    const { billingKg, applied } = applyOversizeRule(5, { l: 150, w: 50, h: 50 });
    expect(applied).toBe(true);
    expect(billingKg).toBe(40);
  });

  it('computeUpsFreight가 대형포장물 조건 충족 시 OVERSIZE 요금을 강제 포함한다', () => {
    const data = { ...baseData(), oversizeCharge };
    const input: UpsFreightInput = { ...baseInput(), dimL: 150, dimW: 50, dimH: 50 };
    const result = computeUpsFreight(input, data);
    expect(result.breakdown.oversizeApplied).toBe(true);
    expect(result.billingWeightKg).toBeGreaterThanOrEqual(40);
    expect(result.breakdown.otherChargeItems.some((c) => c.chargeCode === 'OVERSIZE')).toBe(true);
  });

  it('조건 미충족 시 OVERSIZE 요금이 포함되지 않는다', () => {
    const data = { ...baseData(), oversizeCharge };
    const result = computeUpsFreight(baseInput(), data);
    expect(result.breakdown.oversizeApplied).toBe(false);
    expect(result.breakdown.otherChargeItems.some((c) => c.chargeCode === 'OVERSIZE')).toBe(false);
  });
});

describe('TC-UPS-ENGINE-04: Agency 단계 계산 (An-14 R3~R5)', () => {
  it('override가 있으면 override 값을 그대로 사용한다(source=override)', () => {
    const result = computeAgencyFreight({
      platformSellingTotal: 100000,
      discountRate: 0.1,
      overrideSellingPrice: 95000,
      overrideCostPrice: 90000,
      agencyOtherCharges: [{ sellingPrice: 3000, costPrice: 2000 }],
    });
    expect(result.source).toBe('override');
    expect(result.agencyCostPrice).toBe(92000);
    expect(result.agencySellingPrice).toBe(98000);
  });

  it('override가 없으면 discount_rate로 폴백 계산한다(source=platform_fallback)', () => {
    const result = computeAgencyFreight({
      platformSellingTotal: 100000,
      discountRate: 0.2,
      overrideSellingPrice: null,
      overrideCostPrice: null,
      agencyOtherCharges: [],
    });
    expect(result.source).toBe('platform_fallback');
    expect(result.agencyCostPrice).toBe(80000);
  });
});

describe('TC-UPS-ENGINE-05: Shipper 단계 계산 (An-14 R6)', () => {
  it('화주 할인율을 Agency 판매가에 적용해 최종 운송비를 산출한다', () => {
    const result = computeShipperFreight(98000, 0.05);
    expect(result.finalFreight).toBeCloseTo(93100, 2);
  });

  it('할인율 0이면 Agency 판매가와 동일하다', () => {
    const result = computeShipperFreight(50000, 0);
    expect(result.finalFreight).toBe(50000);
  });
});
