// Phase 7 UPS 요금 계산 엔진 단위 테스트
// TASK-141 IMP-112 (R-09 회귀 테스트)

import { describe, it, expect } from 'vitest';
import {
  ceilToHalfKg,
  resolveZoneByCountry,
  calcChargeableWeight,
  computeUpsFreight,
} from '@/lib/ups/pricing-engine';
import type {
  UpsZoneWithCountries,
  UpsPricingData,
  UpsFreightInput,
} from '@/types/ups';

// ── 공통 픽스처 ─────────────────────────────────────────────────────────────

const mockZone = (zoneCode: string, countryCodes: string[]): UpsZoneWithCountries => ({
  id: `zone-${zoneCode}`, zone_code: zoneCode, zone_name: `Zone ${zoneCode}`,
  description: null, is_active: true, sort_order: 0,
  created_at: '2026-06-14', created_by: null,
  countries: countryCodes.map((cc, i) => ({
    id: `zc-${i}`, zone_id: `zone-${zoneCode}`, country_code: cc,
    created_at: '2026-06-14', created_by: null,
  })),
});

const BASE_DATA: UpsPricingData = {
  zone: { id: 'zone-Z1', zone_code: 'Z1', zone_name: 'Zone 1',
    description: null, is_active: true, sort_order: 0, created_at: '', created_by: null },
  product: { id: 'prod-1', product_code: 'WW-DOC', sub_code: null, product_name: '서류',
    cargo_type: 'DOC', ddu_available: true, ddp_available: false,
    is_active: true, sort_order: 1, created_at: '' },
  baseRate: { id: 'rate-1', product_id: 'prod-1', zone_id: 'zone-Z1', weight_kg: 1,
    selling_price: 20000, cost_price: 15000, currency: 'KRW',
    valid_from: '2026-01-01', valid_until: null, is_active: true,
    created_at: '', created_by: null },
  fuelSurcharge: null,
  otherCharges: [],
};

// ── TC-UPS-P-01: 부피중량 > 실중량 → chargeableKg = volumetricKg ─────────────

describe('TC-UPS-P-01: 부피중량이 실중량을 초과할 때 청구중량 결정', () => {
  it('30×30×30cm / 5000 = 5.4kg (실중량 2kg) → chargeableKg=5.4', () => {
    const { chargeableKg, volumetricKg } = calcChargeableWeight(
      2, { l: 30, w: 30, h: 30 }, 5000
    );
    expect(volumetricKg).toBeCloseTo(5.4);
    expect(chargeableKg).toBeCloseTo(5.4);
  });

  it('실중량 > 부피중량이면 chargeableKg = actualKg', () => {
    const { chargeableKg, volumetricKg } = calcChargeableWeight(
      10, { l: 20, w: 20, h: 20 }, 5000
    );
    expect(volumetricKg).toBeCloseTo(1.6);
    expect(chargeableKg).toBe(10);
  });

  it('치수 없으면 chargeableKg = actualKg, volumetricKg = 0', () => {
    const { chargeableKg, volumetricKg } = calcChargeableWeight(3.5);
    expect(chargeableKg).toBe(3.5);
    expect(volumetricKg).toBe(0);
  });
});

// ── TC-UPS-P-02: Zone 매핑 (국가코드 → Zone) ─────────────────────────────────

describe('TC-UPS-P-02: 국가코드 → Zone 매핑', () => {
  const zones: UpsZoneWithCountries[] = [
    mockZone('Z1', ['KOR', 'JPN']),
    mockZone('Z3', ['USA', 'CAN']),
  ];

  it('KOR → Z1 정확 매핑', () => {
    const zone = resolveZoneByCountry('KOR', zones);
    expect(zone?.zone_code).toBe('Z1');
  });

  it('소문자 입력(usa)도 Z3 매핑', () => {
    const zone = resolveZoneByCountry('usa', zones);
    expect(zone?.zone_code).toBe('Z3');
  });

  it('등록되지 않은 국가코드 → null', () => {
    const zone = resolveZoneByCountry('DEU', zones);
    expect(zone).toBeNull();
  });
});

// ── TC-UPS-P-03: 유류할증료 합산 ──────────────────────────────────────────────

describe('TC-UPS-P-03: 유류할증료 기본운임 합산', () => {
  it('selling_rate 23.5% → fuelSurchargeSellingAmount = 20000 × 0.235 = 4700', () => {
    const data: UpsPricingData = {
      ...BASE_DATA,
      fuelSurcharge: { id: 'fuel-1', product_id: null, effective_week: '2026-06-09',
        selling_rate: 0.235, cost_rate: 0.21, created_at: '', created_by: null },
    };
    const input: UpsFreightInput = { productId: 'prod-1', destCountryCode: 'KOR',
      actualWeightKg: 1, effectiveDate: '2026-06-14' };
    const result = computeUpsFreight(input, data);
    expect(result.fuelSurchargeSellingAmount).toBeCloseTo(4700);
    expect(result.fuelSurchargeCostAmount).toBeCloseTo(3150); // 15000 × 0.21
  });

  it('유류할증료 없으면 fuelSurchargeSellingAmount = 0', () => {
    const input: UpsFreightInput = { productId: 'prod-1', destCountryCode: 'KOR',
      actualWeightKg: 1 };
    const result = computeUpsFreight(input, BASE_DATA);
    expect(result.fuelSurchargeSellingAmount).toBe(0);
  });
});

// ── TC-UPS-P-04: OtherCharges 합산 ────────────────────────────────────────────

describe('TC-UPS-P-04: OtherCharges 합산 (유류할증 연동 포함)', () => {
  it('fuel_surcharge_applicable=true OC → OC 금액에 유류할증 가산', () => {
    const data: UpsPricingData = {
      ...BASE_DATA,
      fuelSurcharge: { id: 'fuel-1', product_id: null, effective_week: '2026-06-09',
        selling_rate: 0.235, cost_rate: 0.21, created_at: '', created_by: null },
      otherCharges: [{
        id: 'oc-1', charge_code: 'ECS', charge_name: '긴급화물할증', unit: 'PKG',
        fuel_surcharge_applicable: true, selling_price: 5000, cost_price: 4000,
        currency: 'KRW', is_active: true, created_at: '', created_by: null,
      }],
    };
    const input: UpsFreightInput = { productId: 'prod-1', destCountryCode: 'KOR',
      actualWeightKg: 1 };
    const result = computeUpsFreight(input, data);
    // OC selling: 5000 + 5000×0.235 = 5000 + 1175 = 6175
    expect(result.otherChargesSellingTotal).toBeCloseTo(6175);
    expect(result.breakdown.otherChargeItems[0].fuelSurchargeSelling).toBeCloseTo(1175);
  });

  it('fuel_surcharge_applicable=false OC → 유류할증 미가산', () => {
    const data: UpsPricingData = {
      ...BASE_DATA,
      otherCharges: [{
        id: 'oc-2', charge_code: 'INS', charge_name: '보험료', unit: 'LOT',
        fuel_surcharge_applicable: false, selling_price: 3000, cost_price: 2500,
        currency: 'KRW', is_active: true, created_at: '', created_by: null,
      }],
    };
    const input: UpsFreightInput = { productId: 'prod-1', destCountryCode: 'KOR',
      actualWeightKg: 1 };
    const result = computeUpsFreight(input, data);
    expect(result.otherChargesSellingTotal).toBe(3000);
    expect(result.breakdown.otherChargeItems[0].fuelSurchargeSelling).toBe(0);
  });
});

// ── TC-UPS-P-05: totalSelling / totalCost 분리 계산 ───────────────────────────

describe('TC-UPS-P-05: totalSelling / totalCost 분리 정확도', () => {
  it('selling ≠ cost, 각각 독립 합산', () => {
    const data: UpsPricingData = {
      ...BASE_DATA,
      fuelSurcharge: { id: 'fuel-1', product_id: null, effective_week: '2026-06-09',
        selling_rate: 0.235, cost_rate: 0.21, created_at: '', created_by: null },
      otherCharges: [{
        id: 'oc-1', charge_code: 'ECS', charge_name: '긴급', unit: 'PKG',
        fuel_surcharge_applicable: false, selling_price: 2000, cost_price: 1500,
        currency: 'KRW', is_active: true, created_at: '', created_by: null,
      }],
    };
    const input: UpsFreightInput = { productId: 'prod-1', destCountryCode: 'KOR',
      actualWeightKg: 1 };
    const result = computeUpsFreight(input, data);
    // selling: 20000 + 20000×0.235 + 2000 = 26700
    expect(result.totalSellingPrice).toBeCloseTo(26700);
    // cost: 15000 + 15000×0.21 + 1500 = 19650
    expect(result.totalCostPrice).toBeCloseTo(19650);
    expect(result.totalSellingPrice).not.toBe(result.totalCostPrice);
  });

  it('ceilToHalfKg: 2.3 → 2.5, 2.5 → 2.5, 2.6 → 3.0', () => {
    expect(ceilToHalfKg(2.3)).toBe(2.5);
    expect(ceilToHalfKg(2.5)).toBe(2.5);
    expect(ceilToHalfKg(2.6)).toBe(3.0);
    expect(ceilToHalfKg(0.1)).toBe(0.5);
  });
});
