import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { ShipperUpsRatesClient } from '@/app/[locale]/(dashboard)/shipper/ups-rates/shipper-ups-rates-client';

const mockZones = [
  { id: 'z1', zone_code: 'JP', zone_name: 'Japan', countries: [] },
] as any[];

const mockProducts = [
  { id: 'p1', product_code: 'WW_EXPEDITED', product_name: 'Expedited', cargo_type: 'NON_DOC' },
] as any[];

const mockBaseRates = [] as any[];
const mockFuelSurcharges = [] as any[];
const mockOtherCharges = [] as any[];
const mockWeightTierRates = [] as any[];
const mockFreightMinimums = [] as any[];

const mockSurgeFees = [
  { id: 'sf-1', destination_country_code: 'JP', selling_rate_per_kg: 800, cost_rate_per_kg: 640, currency: 'KRW', effective_from: '2026-01-01', effective_until: '2026-12-31' },
  { id: 'sf-2', destination_country_code: 'US', selling_rate_per_kg: 716, cost_rate_per_kg: 572.80, currency: 'KRW', effective_from: '2026-01-01', effective_until: null },
];

const defaultProps = {
  zones: mockZones,
  products: mockProducts,
  baseRates: mockBaseRates,
  fuelSurcharges: mockFuelSurcharges,
  otherCharges: mockOtherCharges,
  weightTierRates: mockWeightTierRates,
  freightMinimums: mockFreightMinimums,
  surgeFees: mockSurgeFees,
  zoneDiscountMap: {},
};

describe('TC-ISS590-01: ShipperUpsRatesClient 급증 수수료 탭 렌더링', () => {
  it('급증 수수료 탭이 표시되고 클릭 시 SurgeFeeTable이 렌더링됨', () => {
    render(<ShipperUpsRatesClient {...defaultProps} />);

    const surgeTab = screen.getByRole('button', { name: /급증 수수료/i });
    expect(surgeTab).toBeInTheDocument();

    fireEvent.click(surgeTab);

    expect(screen.getByText('JP')).toBeInTheDocument();
    expect(screen.getByText('800 KRW')).toBeInTheDocument();
    expect(screen.getByText(/2026-01-01 ~ 2026-12-31/)).toBeInTheDocument();

    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('716 KRW')).toBeInTheDocument();
    expect(screen.getByText(/~ 무기한/)).toBeInTheDocument();
  });
});

describe('TC-ISS590-02: ShipperUpsRatesClient 기본 탭 동작', () => {
  it('기본 탭(기준요금)이 활성화되어 있고, 다른 탭으로 전환 가능', () => {
    render(<ShipperUpsRatesClient {...defaultProps} />);

    const baseRatesTab = screen.getByRole('button', { name: /기준요금/i });
    expect(baseRatesTab).toHaveClass('border-brand-600');

    const surgeTab = screen.getByRole('button', { name: /급증 수수료/i });
    fireEvent.click(surgeTab);

    expect(surgeTab).toHaveClass('border-brand-600');
    expect(baseRatesTab).not.toHaveClass('border-brand-600');
  });
});
