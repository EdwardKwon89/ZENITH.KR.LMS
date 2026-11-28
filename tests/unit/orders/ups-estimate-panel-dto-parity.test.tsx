import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UpsFreightEstimatePanel } from '@/components/orders/UpsFreightEstimatePanel';
import { buildEstimateDto, type EstimateAccess } from '@/lib/ups/estimate-dto';
import type { UpsFreightEstimate } from '@/lib/ups/estimate-core';

function makeFull(): UpsFreightEstimate {
  return {
    platform: {
      chargeableWeightKg: 5,
      billingWeightKg: 5,
      baseSellingPrice: 100,
      baseCostPrice: 80,
      fuelSurchargeSellingAmount: 10,
      fuelSurchargeCostAmount: 8,
      otherChargesSellingTotal: 6,
      otherChargesCostTotal: 4,
      surgeFeeSellingAmount: 0,
      surgeFeeCostAmount: 0,
      totalSellingPrice: 116,
      totalCostPrice: 92,
      currency: 'USD',
      breakdown: {
        zone: { zone_code: 'Z1', zone_name: 'Zone 1' },
        product: { product_code: 'WW_EXPRESS_NONDOC', product_name: 'Express', cargo_type: 'NON_DOC' },
        actualWeightKg: 5,
        volumetricWeightKg: 2,
        chargeableWeightKg: 5,
        volumetricDivisor: 5000,
        billingWeightKg: 5,
        baseRateId: 'r1',
        baseSellingPrice: 100,
        baseCostPrice: 80,
        costSurchargeRate: 0,
        fuelSurchargeId: null,
        fuelSurchargeRate: 0.1,
        fuelSurchargeSellingAmount: 10,
        fuelSurchargeCostAmount: 8,
        otherChargeItems: [
          { chargeId: 'c1', chargeCode: 'OVERSIZE', chargeName: 'Oversize', unit: 'PER_SHIPMENT', sellingBase: 5, costBase: 3, fuelSurchargeSelling: 1, fuelSurchargeCost: 1 },
        ],
        otherChargesSellingTotal: 6,
        otherChargesCostTotal: 4,
        surgeFeeId: null,
        surgeFeeSellingRatePerKg: 0,
        surgeFeeSellingAmount: 0,
        surgeFeeCostAmount: 0,
        oversizeApplied: true,
      },
    },
    agency: { baseSellingPrice: 100, fuelSurchargeSellingAmount: 10, otherChargesSellingTotal: 6, surgeFeeSellingAmount: 0, platformSellingTotal: 116, agencyCostPrice: 92, agencySellingPrice: 110, discountRate: 0.04, agencyOtherChargesTotal: 0 },
    shipper: { baseSellingPrice: 100, fuelSurchargeSellingAmount: 10, otherChargesSellingTotal: 6, surgeFeeSellingAmount: 0, shipperDiscountRate: 0.02, finalFreight: 112 },
  };
}

const AFFILIATED: EstimateAccess = { includeCost: false, includePlatformSelling: false, includeAgency: false, includeShipper: true, includeChargeItems: true };
const DIRECT: EstimateAccess = { includeCost: false, includePlatformSelling: true, includeAgency: false, includeShipper: false, includeChargeItems: true };

function textOf(node: HTMLElement): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('R-10 표시 금액 동일성 — 변경 전(전체 payload) vs 변경 후(DTO)', () => {
  it('대리점 소속 화주: 총액·부가항목 행 표시가 동일하다', () => {
    const full = makeFull();
    const { container: before } = render(<UpsFreightEstimatePanel estimate={full as any} loading={false} />);
    const dto = buildEstimateDto(full, AFFILIATED);
    const { container: after } = render(<UpsFreightEstimatePanel estimate={dto as any} loading={false} />);

    const beforeText = textOf(before);
    const afterText = textOf(after);
    expect(afterText).toBe(beforeText);
    expect(afterText).toContain('Oversize');
    expect(beforeText).toContain('Oversize');
    expect(afterText).toContain('부피중량: 2.0kg');
    expect(beforeText).toContain('부피중량: 2.0kg');
  });

  it('비소속 화주: 총액·부가항목 행 표시가 동일하다', () => {
    const full = makeFull();
    // 변경 전 비소속 화주 응답: agency/shipper 단계 없음(플랫폼 판매가만)
    const beforePayload = { ...full, agency: null, shipper: null };
    const { container: before } = render(<UpsFreightEstimatePanel estimate={beforePayload as any} loading={false} />);
    const dto = buildEstimateDto(full, DIRECT);
    const { container: after } = render(<UpsFreightEstimatePanel estimate={dto as any} loading={false} />);

    expect(textOf(after)).toBe(textOf(before));
    expect(textOf(after)).toContain('Oversize');
    expect(textOf(before)).toContain('Oversize');
  });
});
