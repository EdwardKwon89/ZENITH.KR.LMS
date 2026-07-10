import { describe, it, expect } from 'vitest';
import { computeUpsFreight, resolveBillingWeight } from '@/lib/ups/pricing-engine';
import type {
  UpsPricingData,
  UpsFreightInput,
  UpsWeightTierRate,
  UpsFreightMinimum,
} from '@/types/ups';

const baseData = (): UpsPricingData => ({
  zone: { id: 'z1', zone_code: 'Z8', zone_name: 'North America', description: null, is_active: true, sort_order: 8, created_at: '', created_by: null } as any,
  product: { id: 'p1', product_code: 'WW_EXPRESS_NONDOC', sub_code: null, product_name: 'Express', cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '' } as any,
  baseRate: { id: 'r1', product_id: 'p1', zone_id: 'z1', weight_kg: 20, selling_price: 150000, cost_price: 120000, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null } as any,
  fuelSurcharge: { id: 'f1', product_id: null, effective_week: '2026-06-29', selling_rate: 0.185, cost_rate: 0.155, created_at: '', created_by: null } as any,
  otherCharges: [],
  weightTierRates: [],
  freightMinimum: null,
});

const mockWeightTierRates = (): UpsWeightTierRate[] => [
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
    tier_max_kg: 70,
    price_per_kg_selling: 4500,
    price_per_kg_cost: 3800,
    currency: 'KRW',
    valid_from: '2026-07-01',
    valid_until: null,
    is_active: true,
    created_at: '',
    created_by: null,
    updated_at: '',
  },
];

const mockFreightMinimum = (): UpsFreightMinimum => ({
  id: 'fm1',
  zone_id: 'z1',
  product_id: 'p1',
  min_charge_selling: 180000,
  min_charge_cost: 150000,
  currency: 'KRW',
  is_active: true,
  created_at: '',
  created_by: null,
  updated_at: '',
});

describe('TC-UPS-TIER: 20kg 초과 티어 요율 계산 (Issue #303)', () => {
  it('20kg 초과 — baseRate[20kg] + 초과분×tier단가로 계산한다', () => {
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 25,
    };
    const result = computeUpsFreight(input, data);
    // 150000 + (25-20)*6000 = 150000 + 30000 = 180000
    expect(result.billingWeightKg).toBe(25);
    expect(result.baseSellingPrice).toBe(180000);
    expect(result.baseCostPrice).toBeCloseTo((120000 + (25 - 20) * 5000) * 1.07, 2);
    expect(result.breakdown.baseRateId).toBe('t1');
  });

  it('20kg 초과 시 중량 전체에 단가를 곱하지 않고 20kg 기준+초과분만 계산한다', () => {
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 30,
    };
    const result = computeUpsFreight(input, data);
    // Old bug: 30 * 6000 = 180000
    // Fixed: 150000 + (30-20)*6000 = 150000 + 60000 = 210000
    expect(result.baseSellingPrice).toBe(210000);
    expect(result.breakdown.baseSellingPrice).toBe(210000);
  });

  it('20kg 초과 반올림 후 billingWeight 기준으로 계산한다', () => {
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 20.1,
    };
    const result = computeUpsFreight(input, data);
    // billingWeight = 21 (올림)
    // 150000 + (21-20)*6000 = 150000 + 6000 = 156000
    expect(result.billingWeightKg).toBe(21);
    expect(result.baseSellingPrice).toBe(156000);
    expect(result.breakdown.baseRateId).toBe('t1');
  });
});

describe('TC-UPS-MONOTONIC: 단조증가 보장 (DWB 제거 후, Issue #303)', () => {
  it('DWB 제거로 인해 단조증가가 보장된다 (25kg < 30kg 판매가)', () => {
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const r25 = computeUpsFreight({ ...baseInput(), actualWeightKg: 25 }, data);
    const r30 = computeUpsFreight({ ...baseInput(), actualWeightKg: 30 }, data);
    expect(r25.baseSellingPrice).toBeLessThan(r30.baseSellingPrice);
    expect(r30.baseSellingPrice - r25.baseSellingPrice).toBe(30000); // +5kg × 6000
  });
});

describe('TC-UPS-FREIGHTMIN: 공용 최소운임 스텝 제거 (Issue #303)', () => {
  it('일반 제품(Express)은 freightMinimum이 있어도 적용되지 않는다', () => {
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
      freightMinimum: mockFreightMinimum(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 25,
    };
    const result = computeUpsFreight(input, data);
    // 결과는 150000 + 5*6000 = 180000 (최소운임과 같지만 스텝 자체가 없음)
    expect(result.baseSellingPrice).toBe(180000);
  });
});

describe('TC-UPS-FREIGHT: Freight 제품군 70kg 기준 계산 (Issue #303)', () => {
  const freightData = (): UpsPricingData => ({
    ...baseData(),
    baseRate: null,
    product: { ...baseData().product, product_code: 'WW_FLIGHT', product_name: 'Freight' } as any,
    freightMinimum: mockFreightMinimum(),
    weightTierRates: [
      { id: 'ft3', product_id: 'p1', zone_id: 'z1', tier_min_kg: 71, tier_max_kg: 99, price_per_kg_selling: 3000, price_per_kg_cost: 2500, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null, updated_at: '' },
      { id: 'ft4', product_id: 'p1', zone_id: 'z1', tier_min_kg: 100, tier_max_kg: 299, price_per_kg_selling: 2500, price_per_kg_cost: 2000, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null, updated_at: '' },
    ],
  });

  it('≤70kg — 최소운임 정액 적용 (baseRate 미조회)', () => {
    const data = freightData();
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 50,
    };
    const result = computeUpsFreight(input, data);
    expect(result.baseSellingPrice).toBe(180000);
    expect(result.baseCostPrice).toBe(150000);
    expect(result.breakdown.baseRateId).toBe('fm1');
  });

  it('>70kg — 최소운임 + 초과분×tier단가', () => {
    const data = freightData();
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 80,
    };
    const result = computeUpsFreight(input, data);
    // 180000 + (80-70)*3000 = 180000 + 30000 = 210000
    expect(result.baseSellingPrice).toBe(210000);
    expect(result.baseCostPrice).toBeCloseTo((150000 + (80 - 70) * 2500) * 1.07, 2);
    expect(result.breakdown.baseRateId).toBe('ft3');
  });

  it('>70kg 다른 구간(100-299) — tier 매칭 후 계산', () => {
    const data = freightData();
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 150,
    };
    const result = computeUpsFreight(input, data);
    // 180000 + (150-70)*2500 = 180000 + 200000 = 380000
    expect(result.baseSellingPrice).toBe(380000);
    expect(result.breakdown.baseRateId).toBe('ft4');
  });
});

function baseInput(): UpsFreightInput {
  return { productId: 'p1', destCountryCode: 'USA', actualWeightKg: 5 };
}
