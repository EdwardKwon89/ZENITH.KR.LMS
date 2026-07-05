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

describe('TC-UPS-TIER: 20kg 초과 티어 요율 계산', () => {
  it('20kg 초과 화물에 대해 per-kg 티어 요율을 적용하여 계산한다', () => {
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
    expect(result.billingWeightKg).toBe(25);
    expect(result.baseSellingPrice).toBe(25 * 6000); // 150,000
    expect(result.baseCostPrice).toBeCloseTo(25 * 5000 * 1.07, 2);
    expect(result.breakdown.baseRateId).toBe('t1');
  });

  it('20kg 초과 시 1.0kg 단위로 올림하여 매칭한다', () => {
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
    expect(result.billingWeightKg).toBe(21);
    expect(result.baseSellingPrice).toBe(21 * 6000); // 126,000
    expect(result.breakdown.baseRateId).toBe('t1');
  });
});

describe('TC-UPS-DWB: DWB (Deficit Weight Billing) 로직 검증', () => {
  it('다음 상위 중량 구간의 최소가 요율이 더 저렴할 때 DWB를 적용한다 (20kg 초과 -> 초과)', () => {
    // 21-44구간 40kg = 40 * 6000 = 240,000
    // 45-70구간 최소(45kg) = 45 * 4500 = 202,500 (적용 대상)
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 40,
    };
    const result = computeUpsFreight(input, data);
    expect(result.billingWeightKg).toBe(45);
    expect(result.baseSellingPrice).toBe(202500);
    expect(result.dwbApplied).toBe(true);
    expect(result.breakdown.dwbApplied).toBe(true);
    expect(result.breakdown.dwbOriginalWeightKg).toBe(40);
    expect(result.breakdown.dwbOriginalSellingPrice).toBe(240000);
    expect(result.breakdown.baseRateId).toBe('t2');
  });

  it('실제 요금이 더 저렴할 경우 DWB를 적용하지 않는다', () => {
    // 21-44구간 22kg = 22 * 6000 = 132,000
    // 45-70구간 최소(45kg) = 45 * 4500 = 202,500 (미적용)
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 22,
    };
    const result = computeUpsFreight(input, data);
    expect(result.billingWeightKg).toBe(22);
    expect(result.baseSellingPrice).toBe(132000);
    expect(result.dwbApplied).toBe(false);
    expect(result.breakdown.dwbApplied).toBe(false);
  });

  it('20kg 이하에서 다음 per-kg 구간으로 DWB 전이가 발생할 수 있다 (20kg 이하 -> 초과)', () => {
    // 20kg Flat 요금 = 150,000
    // 21-44구간 최소(21kg) = 21 * 6000 = 126,000 (적용 대상)
    const data = {
      ...baseData(),
      weightTierRates: mockWeightTierRates(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 20,
    };
    const result = computeUpsFreight(input, data);
    expect(result.billingWeightKg).toBe(21);
    expect(result.baseSellingPrice).toBe(126000);
    expect(result.dwbApplied).toBe(true);
    expect(result.breakdown.dwbOriginalWeightKg).toBe(20);
    expect(result.breakdown.dwbOriginalSellingPrice).toBe(150000);
  });
});

describe('TC-UPS-FREIGHTMIN: Freight 최소 운임 한도 검증', () => {
  it('기본 요율 계산 결과가 최소 운임 미만인 경우 최소 운임으로 상향한다', () => {
    // 25kg = 25 * 6000 = 150,000
    // 최소운임 = 180,000 (적용 대상)
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
    expect(result.baseSellingPrice).toBe(180000);
    expect(result.baseCostPrice).toBe(150000);
    expect(result.freightMinApplied).toBe(true);
    expect(result.breakdown.freightMinApplied).toBe(true);
    expect(result.breakdown.freightMinOriginalSelling).toBe(150000);
  });

  it('기본 요율 계산 결과가 최소 운임 이상인 경우 상향하지 않는다', () => {
    // 35kg = 35 * 6000 = 210,000 (최소운임 180,000보다 큼)
    const tierRates = mockWeightTierRates();
    tierRates[1].price_per_kg_selling = 6000; // DWB 방지
    const data = {
      ...baseData(),
      weightTierRates: tierRates,
      freightMinimum: mockFreightMinimum(),
    };
    const input: UpsFreightInput = {
      productId: 'p1',
      destCountryCode: 'USA',
      actualWeightKg: 35,
    };
    const result = computeUpsFreight(input, data);
    expect(result.baseSellingPrice).toBe(210000);
    expect(result.freightMinApplied).toBe(false);
  });
});
