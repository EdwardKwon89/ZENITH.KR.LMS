import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UpsFreightEstimatePanel } from '@/components/orders/UpsFreightEstimatePanel';
import { UpsFreightEstimate } from '@/app/actions/ups/freight';

function makeEstimate(overrides?: Partial<UpsFreightEstimate>): UpsFreightEstimate {
  return {
    platform: {
      chargeableWeightKg: 5,
      billingWeightKg: 5,
      baseSellingPrice: 100,
      baseCostPrice: 80,
      fuelSurchargeSellingAmount: 10,
      fuelSurchargeCostAmount: 8,
      otherChargesSellingTotal: 0,
      otherChargesCostTotal: 0,
      totalSellingPrice: 110,
      totalCostPrice: 88,
      currency: 'USD',
      breakdown: {
        base: 100,
        fuelSurcharge: 10,
        otherCharges: 0,
        total: 110,
      },
    },
    agency: null,
    shipper: {
      agencySellingPrice: 110,
      shipperDiscountRate: 0,
      finalFreight: 110,
    },
    ...overrides,
  } as UpsFreightEstimate;
}

describe('UpsFreightEstimatePanel', () => {
  it('TC-P7-UI-ESTIMATE-01: shows loading state', () => {
    render(<UpsFreightEstimatePanel estimate={null} loading={true} />);
    expect(screen.getByText('견적 계산 중...')).toBeDefined();
  });

  it('TC-P7-UI-ESTIMATE-01: displays shipper selling price and currency when estimate exists', () => {
    render(<UpsFreightEstimatePanel estimate={makeEstimate()} loading={false} />);
    expect(screen.getByText('UPS 예상 운임')).toBeDefined();
    expect(screen.getByText('110')).toBeDefined();
    expect(screen.getByText('USD')).toBeDefined();
  });

  it('TC-P7-UI-ESTIMATE-02: renders nothing when estimate is null and not loading', () => {
    const { container } = render(<UpsFreightEstimatePanel estimate={null} loading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('TC-P7-UI-ESTIMATE-02: displays error message when error is provided', () => {
    render(<UpsFreightEstimatePanel estimate={null} loading={false} error="견적 계산 실패" />);
    expect(screen.getByText('견적 계산 실패')).toBeDefined();
  });
});
