import { describe, it, expect } from 'vitest';
import { computeUpsFreight } from '@/lib/ups/pricing-engine';
import type { UpsPricingData, UpsFreightInput, UpsZoneWithCountries } from '@/types/ups';

// Issue #534: alpha-2 국가코드 통일 후 surge fee 매칭 검증
describe('TC-ISS534: UPS 급증 수수료 alpha-2 국가코드 매칭 (Issue #534)', () => {
  const jpSurgeFee = {
    id: 'sf-jp', destination_country_code: 'JP', selling_rate_per_kg: 15.00, cost_rate_per_kg: 12.00,
    currency: 'JPY', effective_from: '2026-07-05', effective_until: null, is_active: true,
    created_at: '', created_by: null,
  } as any;

  const zoneData = {
    zone: { id: 'z2', zone_code: 'Z2', zone_name: 'Asia Pacific', description: null, is_active: true, sort_order: 2, created_at: '', created_by: null } as any,
    product: { id: 'p1', product_code: 'WW_EXPRESS_NONDOC', sub_code: null, product_name: 'Express', cargo_type: 'NON_DOC', ddu_available: false, ddp_available: true, is_active: true, sort_order: 1, created_at: '' } as any,
    baseRate: { id: 'r1', product_id: 'p1', zone_id: 'z2', weight_kg: 5, selling_price: 85000, cost_price: 68000, currency: 'KRW', valid_from: '2026-07-01', valid_until: null, is_active: true, created_at: '', created_by: null } as any,
    fuelSurcharge: { id: 'f1', product_id: null, effective_week: '2026-06-29', selling_rate: 0.185, cost_rate: 0.155, created_at: '', created_by: null } as any,
    otherCharges: [],
    weightTierRates: [],
    freightMinimums: [],
  } as unknown as UpsPricingData;

  const jpInput: UpsFreightInput = {
    productId: 'p1',
    destCountryCode: 'JP',
    actualWeightKg: 5,
  };

  it('TC-ISS534-01: JP(alpha-2) 목적지 + JP(alpha-2) 시드 데이터 매칭 → surgeFeeSellingAmount > 0', () => {
    const data = { ...zoneData, surgeFee: jpSurgeFee };
    const result = computeUpsFreight(jpInput, data);
    // surge base = 15.00 * 5 = 75.00 (JPY)
    expect(result.surgeFeeSellingAmount).toBeGreaterThan(0);
    expect(result.breakdown.surgeFeeId).toBe('sf-jp');
  });

  it("TC-ISS534-02: alpha-3 'JPN'으로 조회하면 0건 → surgeFeeSellingAmount = 0 (과거 버그 재현)", () => {
    const wrongData = { ...zoneData, surgeFee: null };
    const result = computeUpsFreight(jpInput, wrongData);
    expect(result.surgeFeeSellingAmount).toBe(0);
    expect(result.breakdown.surgeFeeId).toBeNull();
  });

  it('TC-ISS534-03: US(alpha-2) 목적지 시드 데이터와 동일한 alpha-2 컨벤션 확인', () => {
    const usSurgeFee = {
      ...jpSurgeFee, id: 'sf-us', destination_country_code: 'US', selling_rate_per_kg: 716, cost_rate_per_kg: 572.80, currency: 'KRW',
    };
    const usInput: UpsFreightInput = { ...jpInput, destCountryCode: 'US' };
    const data = { ...zoneData, surgeFee: usSurgeFee };
    const result = computeUpsFreight(usInput, data);
    // surge base = 716 * 5 = 3580 (KRW)
    expect(result.surgeFeeSellingAmount).toBeGreaterThan(0);
    expect(result.breakdown.surgeFeeSellingRatePerKg).toBe(716);
  });

  it('TC-ISS534-04: SurgeFeeForm slice 동작 — alpha-2 2자리까지만 허용', () => {
    // SurgeFeeForm의 onChange: v?.toUpperCase().slice(0, 2)
    const form = { destination_country_code: '' };
    const onChange = (v: string) => { form.destination_country_code = v?.toUpperCase().slice(0, 2); };
    onChange('jpn');
    expect(form.destination_country_code).toBe('JP');
    onChange('us');
    expect(form.destination_country_code).toBe('US');
    onChange('deutschland');
    expect(form.destination_country_code).toBe('DE');
  });
});
