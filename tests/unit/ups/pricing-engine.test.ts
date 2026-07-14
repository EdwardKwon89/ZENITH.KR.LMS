// Phase 7.1 TASK-173 IMP-145 (R-09 회귀 테스트 신규 추가) — An-14 §4
import { describe, it, expect } from 'vitest';
import {
  ceilToHalfKg,
  resolveBillingWeight,
  resolveZoneByCountry,
  calcChargeableWeight,
  isOversizePackage,
  applyOversizeRule,
  computeUpsFreight,
  UPS_COST_SURCHARGE_RATE,
} from '@/lib/ups/pricing-engine';
import { computeAgencyFreight } from '@/lib/ups/agency-pricing';
import { computeShipperFreight } from '@/lib/ups/shipper-pricing';
import type { UpsPricingData, UpsFreightInput, UpsOtherCharge, UpsZoneWithCountries } from '@/types/ups';

const baseData = (): UpsPricingData => ({
  zone: { id: 'z1', zone_code: 'Z8', zone_name: 'North America', description: null, is_active: true, sort_order: 8, created_at: '', created_by: null } as any,
  product: { id: 'p1', product_code: 'WW_EXPRESS_NONDOC', sub_code: null, product_name: 'Express', cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '' } as any,
  baseRate: { id: 'r1', product_id: 'p1', zone_id: 'z1', weight_kg: 5, selling_price: 85000, cost_price: 68000, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null } as any,
  fuelSurcharge: { id: 'f1', product_id: null, effective_week: '2026-06-29', selling_rate: 0.185, cost_rate: 0.155, created_at: '', created_by: null } as any,
  otherCharges: [],
  weightTierRates: [
    {
      id: 't1',
      product_id: 'p1',
      zone_id: 'z1',
      tier_min_kg: 21,
      tier_max_kg: 44,
      price_per_kg_selling: 6000,
      price_per_kg_cost: 5000,
      currency: 'KRW',
      valid_from: '2026-07-01',
      valid_until: null,
      is_active: true,
      created_at: '',
      created_by: null,
      updated_at: '',
    },
    {
      id: 't2',
      product_id: 'p1',
      zone_id: 'z1',
      tier_min_kg: 45,
      tier_max_kg: 100,
      price_per_kg_selling: 4500,
      price_per_kg_cost: 3800,
      currency: 'KRW',
      valid_from: '2026-07-01',
      valid_until: null,
      is_active: true,
      created_at: '',
      created_by: null,
      updated_at: '',
    }
  ],
  freightMinimum: null,
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

describe('TC-UPS-EXPEDITED-ROUND: 상품별 중량 반올림 (DEF-095)', () => {
  it('WW_EXPEDITED는 20kg 이하에서도 항상 1kg 단위로 올림한다', () => {
    expect(resolveBillingWeight(12.3, 'WW_EXPEDITED')).toBe(13);
    expect(resolveBillingWeight(12.0, 'WW_EXPEDITED')).toBe(12);
  });

  it('WW_EXPEDITED는 20kg 초과 시에도 1kg 단위로 올림한다', () => {
    expect(resolveBillingWeight(20.3, 'WW_EXPEDITED')).toBe(21);
  });

  it('그 외 상품은 20kg 이하에서 0.5kg 단위로 올림한다', () => {
    expect(resolveBillingWeight(12.3, 'WW_EXPRESS_NONDOC')).toBe(12.5);
    expect(resolveBillingWeight(20.0, 'WW_EXPRESS_NONDOC')).toBe(20);
  });

  it('그 외 상품은 20kg 초과 시 1kg 단위로 올림한다', () => {
    expect(resolveBillingWeight(20.1, 'WW_EXPRESS_NONDOC')).toBe(21);
    expect(resolveBillingWeight(20.5, 'WW_SAVER_NONDOC')).toBe(21);
  });

  it('computeUpsFreight가 WW_EXPEDITED 청구중량을 1kg 단위로 반영한다', () => {
    const data = {
      ...baseData(),
      product: { ...baseData().product, product_code: 'WW_EXPEDITED' },
    };
    const input: UpsFreightInput = { ...baseInput(), actualWeightKg: 12.3 };
    const result = computeUpsFreight(input, data);
    expect(result.billingWeightKg).toBe(13);
  });
});

describe('TC-UPS-ENGINE-04: Agency 단계 계산 (An-14 R3~R5, Issue #310)', () => {
  it('할인율을 platformSellingTotal에 적용해 Agency 가격을 산출한다', () => {
    const result = computeAgencyFreight({
      platformSellingTotal: 100000,
      discountRate: 0.1,
      agencyOtherCharges: [{ sellingPrice: 3000, costPrice: 2000 }],
    });
    expect(result.agencyCostPrice).toBe(92000);
    expect(result.agencySellingPrice).toBe(93000);
  });

  it('할인율 20%, 기타요금 없음', () => {
    const result = computeAgencyFreight({
      platformSellingTotal: 100000,
      discountRate: 0.2,
      agencyOtherCharges: [],
    });
    expect(result.agencyCostPrice).toBe(80000);
  });
});

describe('TC-UPS-ENGINE-05: Shipper 단계 계산 (An-14 R6)', () => {
  it('화주 할인율을 기본운임에만 적용해 최종 운송비를 산출한다', () => {
    const result = computeShipperFreight(98000, 5000, 2000, 0.05);
    expect(result.baseSellingPrice).toBeCloseTo(93100, 2);
    expect(result.fuelSurchargeSellingAmount).toBe(5000);
    expect(result.otherChargesSellingTotal).toBe(2000);
    expect(result.finalFreight).toBeCloseTo(100100, 2);
  });

  it('할인율 0이면 기본운임이 그대로이고 부가운임도 정가로 합산된다', () => {
    const result = computeShipperFreight(50000, 3000, 1000, 0);
    expect(result.baseSellingPrice).toBe(50000);
    expect(result.finalFreight).toBe(54000);
  });
});

// ─── TASK-179: Zone 해석 ─────────────────────────────────────────

const mockZones: UpsZoneWithCountries[] = [
  { id: 'z2', zone_code: 'Z2', zone_name: 'East Asia', description: null, is_active: true, sort_order: 2, created_at: '', created_by: null,
    countries: [
      { id: 'c1', zone_id: 'z2', country_code: 'JPN', product_family: 'EXPRESS', direction: 'EXPORT', created_at: '', created_by: null },
      { id: 'c2', zone_id: 'z2', country_code: 'JPN', product_family: 'SAVER', direction: 'EXPORT', created_at: '', created_by: null },
      { id: 'c3', zone_id: 'z2', country_code: 'CHN', product_family: 'EXPRESS', direction: 'EXPORT', created_at: '', created_by: null },
    ] as any },
  { id: 'z6', zone_code: 'Z6', zone_name: 'Europe Core', description: null, is_active: true, sort_order: 6, created_at: '', created_by: null,
    countries: [
      { id: 'c4', zone_id: 'z6', country_code: 'DEU', product_family: 'EXPRESS', direction: 'EXPORT', created_at: '', created_by: null },
      { id: 'c5', zone_id: 'z6', country_code: 'DEU', product_family: 'EXPRESS', direction: 'IMPORT', created_at: '', created_by: null },
    ] as any },
];

describe('TC-UPS-ZONEMAP-01: resolveZoneByCountry — 정확매치 + 파라미터 확장', () => {
  it('기본 파라미터(EXPRESS/EXPORT)로 정확매치', () => {
    const result = resolveZoneByCountry('JPN', mockZones);
    expect(result.zone?.zone_code).toBe('Z2');
    expect(result.fallbackApplied).toBe(false);
  });

  it('SAVER/EXPORT 정확매치', () => {
    const result = resolveZoneByCountry('JPN', mockZones, 'SAVER', 'EXPORT');
    expect(result.zone?.zone_code).toBe('Z2');
    expect(result.fallbackApplied).toBe(false);
  });

  it('EXPRESS/IMPORT 정확매치 (DEU)', () => {
    const result = resolveZoneByCountry('DEU', mockZones, 'EXPRESS', 'IMPORT');
    expect(result.zone?.zone_code).toBe('Z6');
    expect(result.fallbackApplied).toBe(false);
  });
});

describe('TC-UPS-ZONEMAP-02: resolveZoneByCountry — Fallback', () => {
  it('매핑 없는 계열(EXPEDITED) → EXPRESS/EXPORT fallback', () => {
    const result = resolveZoneByCountry('JPN', mockZones, 'EXPEDITED', 'EXPORT');
    // JPN has EXPRESS/EXPORT mapping, but not EXPEDITED/EXPORT → fallback
    expect(result.zone?.zone_code).toBe('Z2');
    expect(result.fallbackApplied).toBe(true);
  });

  it('매핑 없는 방향(IMPORT) → EXPRESS/EXPORT fallback', () => {
    const result = resolveZoneByCountry('CHN', mockZones, 'EXPRESS', 'IMPORT');
    // CHN has only EXPRESS/EXPORT → fallback
    expect(result.zone?.zone_code).toBe('Z2');
    expect(result.fallbackApplied).toBe(true);
  });
});

describe('TC-UPS-ZONEMAP-03: resolveZoneByCountry — 미등록 국가 null', () => {
  it('매핑 없는 국가는 null 반환', () => {
    const result = resolveZoneByCountry('XXX', mockZones);
    expect(result.zone).toBeNull();
    expect(result.fallbackApplied).toBe(false);
  });

  it('빈 zones 배열에서 검색 시 null', () => {
    const result = resolveZoneByCountry('JPN', []);
    expect(result.zone).toBeNull();
    expect(result.fallbackApplied).toBe(false);
  });
});
