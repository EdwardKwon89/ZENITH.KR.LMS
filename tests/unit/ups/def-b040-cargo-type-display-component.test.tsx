// DEF-B-040 / Issue #1027: Agency UPS 요율조회 화면 cargo_type 축 반영
// 실제 컴포넌트 렌더링 기반 회귀 테스트
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { AgencyUpsRatesClient } from '@/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client';
import { resolveDiscountRate, candidateCargoTypes } from '@/lib/ups/cargo-type-utils';

vi.mock('@/components/agency/ZoneDiscountForm', () => ({
  ZoneDiscountForm: () => <div data-testid="zone-discount-form" />,
}));

vi.mock('@/components/ups/UpsBaseRateMatrix', () => ({
  default: ({ discountRateMap, priceMode }: any) => (
    <div data-testid="ups-base-rate-matrix" data-price-mode={priceMode}>
      <span data-testid="discount-rate-map">{JSON.stringify(discountRateMap)}</span>
    </div>
  ),
}));

const zones = [
  { id: 'z1', zone_code: 'Z1', zone_name: 'Zone1', is_active: true, sort_order: 1, countries: [] },
  { id: 'z2', zone_code: 'Z2', zone_name: 'Zone2', is_active: true, sort_order: 2, countries: [] },
] as any[];

const products = [
  { id: 'p1', product_code: 'WW_EXPRESS_DOC', product_name: 'Express DOC', cargo_type: 'DOC', is_active: true },
  { id: 'p2', product_code: 'WW_EXPRESS_NONDOC', product_name: 'Express NONDOC', cargo_type: 'NON_DOC', is_active: true },
  { id: 'p3', product_code: 'WW_EXPEDITED', product_name: 'Expedited', cargo_type: 'BOTH', is_active: true },
] as any[];

function makeProps(overrides: any = {}) {
  return {
    zones,
    products,
    baseRates: [],
    fuelSurcharges: [],
    otherCharges: [],
    surgeFees: [],
    weightTierRates: [],
    freightMinimums: [],
    pricingPolicies: [],
    shippers: [],
    agencyOrgId: 'a1',
    ...overrides,
  } as any;
}

describe('TC-DEF-B040-COMP-01: resolveDiscountRate 실제 함수 검증', () => {
  it('Expedited/Flight(BOTH)는 NON_DOC 우선 사용', () => {
    const zoneRates = { 'NON_DOC': 0.75, 'ALL': 0.1 };
    expect(resolveDiscountRate(zoneRates, 'BOTH')).toBe(0.75);
  });

  it('Expedited/Flight(BOTH)는 NON_DOC 없으면 ALL 폴백', () => {
    const zoneRates = { 'ALL': 0.1 };
    expect(resolveDiscountRate(zoneRates, 'BOTH')).toBe(0.1);
  });

  it('DOC 상품은 DOC 할인율 사용', () => {
    const zoneRates = { 'DOC': 0.55, 'NON_DOC': 0.75, 'ALL': 0.1 };
    expect(resolveDiscountRate(zoneRates, 'DOC')).toBe(0.55);
  });

  it('NON_DOC 상품은 NON_DOC 할인율 사용', () => {
    const zoneRates = { 'DOC': 0.55, 'NON_DOC': 0.75, 'ALL': 0.1 };
    expect(resolveDiscountRate(zoneRates, 'NON_DOC')).toBe(0.75);
  });
});

describe('TC-DEF-B040-COMP-02: candidateCargoTypes 실제 함수 검증', () => {
  it('freight.ts와 동일한 우선순위', () => {
    expect(candidateCargoTypes('DOC')).toEqual(['DOC', 'ALL']);
    expect(candidateCargoTypes('NON_DOC')).toEqual(['NON_DOC', 'ALL']);
    expect(candidateCargoTypes('BOTH')).toEqual(['NON_DOC', 'ALL']);
    expect(candidateCargoTypes(undefined)).toEqual(['NON_DOC', 'ALL']);
  });
});

describe('TC-DEF-B040-COMP-03: AgencyUpsRatesClient 컴포넌트 렌더링', () => {
  beforeEach(() => vi.clearAllMocks());

  it('policyByZone이 중첩 구조로 UpsBaseRateMatrix에 전달된다', () => {
    const policies = [
      { id: 'p1', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true },
      { id: 'p2', agency_org_id: 'a1', cargo_type: 'DOC', zone_id: 'z1', discount_rate: 0.55, is_active: true },
      { id: 'p3', agency_org_id: 'a1', cargo_type: 'NON_DOC', zone_id: 'z1', discount_rate: 0.75, is_active: true },
    ];
    render(<AgencyUpsRatesClient {...makeProps({ pricingPolicies: policies })} />);

    const matrix = screen.getByTestId('ups-base-rate-matrix');
    const mapText = screen.getByTestId('discount-rate-map').textContent || '{}';
    const discountRateMap = JSON.parse(mapText);

    expect(discountRateMap['z1']).toBeDefined();
    expect(discountRateMap['z1']['ALL']).toBe(0.1);
    expect(discountRateMap['z1']['DOC']).toBe(0.55);
    expect(discountRateMap['z1']['NON_DOC']).toBe(0.75);
  });

  it('Expedited/Flight(BOTH) 상품은 NON_DOC 정책을 UpsBaseRateMatrix에 전달', () => {
    const policies = [
      { id: 'p1', agency_org_id: 'a1', cargo_type: 'NON_DOC', zone_id: 'z1', discount_rate: 0.75, is_active: true },
      { id: 'p2', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true },
    ];
    render(<AgencyUpsRatesClient {...makeProps({ pricingPolicies: policies })} />);

    const mapText = screen.getByTestId('discount-rate-map').textContent || '{}';
    const discountRateMap = JSON.parse(mapText);

    expect(discountRateMap['z1']['NON_DOC']).toBe(0.75);
    expect(discountRateMap['z1']['ALL']).toBe(0.1);

    const rate = resolveDiscountRate(discountRateMap['z1'], 'BOTH');
    expect(rate).toBe(0.75);
  });

  it('ALL만 등록된 기존 대리점은 UpsBaseRateMatrix에 ALL만 전달', () => {
    const policies = [
      { id: 'p1', agency_org_id: 'a1', cargo_type: 'ALL', zone_id: 'z1', discount_rate: 0.1, is_active: true },
    ];
    render(<AgencyUpsRatesClient {...makeProps({ pricingPolicies: policies })} />);

    const mapText = screen.getByTestId('discount-rate-map').textContent || '{}';
    const discountRateMap = JSON.parse(mapText);

    expect(Object.keys(discountRateMap['z1'])).toEqual(['ALL']);

    const rateAll = resolveDiscountRate(discountRateMap['z1'], 'DOC');
    expect(rateAll).toBe(0.1);
    const rateNonDoc = resolveDiscountRate(discountRateMap['z1'], 'NON_DOC');
    expect(rateNonDoc).toBe(0.1);
    const rateBoth = resolveDiscountRate(discountRateMap['z1'], 'BOTH');
    expect(rateBoth).toBe(0.1);
  });
});

describe('TC-DEF-B040-COMP-04: 되돌리기 검증 — 실제 프로덕션 코드 연결', () => {
  it('resolveDiscountRate가 없으면 Expedited/Flight가 ALL만 사용', () => {
    const zoneRates = { 'NON_DOC': 0.9, 'ALL': 0.1 };

    const buggyRate = zoneRates['ALL'] ?? 0;
    expect(buggyRate).toBe(0.1);

    const correctRate = resolveDiscountRate(zoneRates, 'BOTH');
    expect(correctRate).toBe(0.9);
  });
});
