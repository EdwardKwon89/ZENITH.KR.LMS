import { describe, it, expect } from 'vitest';
import { buildEstimateDto, type EstimateAccess } from '@/lib/ups/estimate-dto';
import type { UpsFreightEstimate } from '@/lib/ups/estimate-core';

const full: UpsFreightEstimate = {
  platform: {
    chargeableWeightKg: 5,
    billingWeightKg: 5,
    baseSellingPrice: 100,
    baseCostPrice: 80,
    fuelSurchargeSellingAmount: 10,
    fuelSurchargeCostAmount: 8,
    otherChargesSellingTotal: 5,
    otherChargesCostTotal: 4,
    surgeFeeSellingAmount: 3,
    surgeFeeCostAmount: 2,
    totalSellingPrice: 118,
    totalCostPrice: 94,
    currency: 'USD',
    breakdown: {
      zone: { zone_code: 'Z1', zone_name: 'Zone 1' },
      product: { product_code: 'WW_EXPRESS_NONDOC', product_name: 'Express', cargo_type: 'NON_DOC' },
      actualWeightKg: 5,
      volumetricWeightKg: 0,
      chargeableWeightKg: 5,
      volumetricDivisor: 5000,
      billingWeightKg: 5,
      baseRateId: 'r1',
      baseSellingPrice: 100,
      baseCostPrice: 80,
      costSurchargeRate: 0.1,
      fuelSurchargeId: 'f1',
      fuelSurchargeRate: 0.2,
      fuelSurchargeSellingAmount: 10,
      fuelSurchargeCostAmount: 8,
      otherChargeItems: [
        { chargeId: 'c1', chargeCode: 'OVERSIZE', chargeName: 'Oversize', unit: 'PER_SHIPMENT', sellingBase: 5, costBase: 4, fuelSurchargeSelling: 1, fuelSurchargeCost: 1 },
      ],
      otherChargesSellingTotal: 5,
      otherChargesCostTotal: 4,
      surgeFeeId: null,
      surgeFeeSellingRatePerKg: 0,
      surgeFeeSellingAmount: 3,
      surgeFeeCostAmount: 2,
      oversizeApplied: true,
    },
  },
  agency: {
    baseSellingPrice: 100,
    fuelSurchargeSellingAmount: 10,
    otherChargesSellingTotal: 5,
    surgeFeeSellingAmount: 3,
    platformSellingTotal: 118,
    agencyCostPrice: 94,
    agencySellingPrice: 112,
    discountRate: 0.05,
    agencyOtherChargesTotal: 0,
  },
  shipper: {
    baseSellingPrice: 100,
    fuelSurchargeSellingAmount: 10,
    otherChargesSellingTotal: 5,
    surgeFeeSellingAmount: 3,
    shipperDiscountRate: 0.02,
    finalFreight: 115,
  },
};

const ADMIN: EstimateAccess = { includeCost: true, includePlatformSelling: true, includeAgency: true, includeShipper: true, includeChargeItems: true };
const AGENCY: EstimateAccess = { includeCost: false, includePlatformSelling: true, includeAgency: true, includeShipper: true, includeChargeItems: true };
const AFFILIATED_SHIPPER: EstimateAccess = { includeCost: false, includePlatformSelling: false, includeAgency: false, includeShipper: true, includeChargeItems: true };
const DIRECT_SHIPPER: EstimateAccess = { includeCost: false, includePlatformSelling: true, includeAgency: false, includeShipper: false, includeChargeItems: true };

describe('estimate DTO — 역할·소속별 전달 범위 (TASK-B-373 PR-2)', () => {
  it('관리자 — 원가 계열·판매가·단계·항목 전체 포함', () => {
    const dto = buildEstimateDto(full, ADMIN);
    expect(dto.platform.totalCostPrice).toBe(94);
    expect(dto.platform.baseCostPrice).toBe(80);
    expect(dto.platform.totalSellingPrice).toBe(118);
    expect(dto.platform.breakdown.otherChargeItems).toHaveLength(1);
    expect(dto.platform.breakdown.baseCostPrice).toBe(80);
    expect(dto.platform.breakdown.otherChargeItems[0].costBase).toBe(4);
    expect(dto.agency).not.toBeNull();
    expect(dto.shipper).not.toBeNull();
  });

  it('대리점 — 자기 단계 포함, 원가 계열 미포함', () => {
    const dto = buildEstimateDto(full, AGENCY);
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.platform.baseCostPrice).toBeUndefined();
    expect(dto.platform.breakdown.baseCostPrice).toBeUndefined();
    expect(dto.platform.totalSellingPrice).toBe(118);
    expect(dto.agency?.agencySellingPrice).toBe(112);
    expect(dto.shipper).not.toBeNull();
  });

  it('대리점 소속 화주 — 플랫폼 판매가·대리점 단계 미포함, 자기 청구 단계만', () => {
    const dto = buildEstimateDto(full, AFFILIATED_SHIPPER);
    expect(dto.platform.totalSellingPrice).toBeNull();
    expect(dto.platform.baseSellingPrice).toBeNull();
    // 부가항목 행은 화주 청구 단계와 동일 금액(할인 미적용) → 표시 동일성 유지
    expect(dto.platform.breakdown.otherChargeItems).toHaveLength(1);
    expect(dto.platform.breakdown.baseSellingPrice).toBeUndefined();
    expect(dto.agency).toBeNull();
    expect(dto.shipper?.finalFreight).toBe(115);
    expect(dto.platform.chargeableWeightKg).toBe(5);
    expect(dto.platform.currency).toBe('USD');
  });

  it('비소속 화주 — 플랫폼 판매가만 포함, 대리점·화주 단계 제외', () => {
    const dto = buildEstimateDto(full, DIRECT_SHIPPER);
    expect(dto.platform.totalSellingPrice).toBe(118);
    expect(dto.platform.totalCostPrice).toBeUndefined();
    expect(dto.platform.breakdown.otherChargeItems).toHaveLength(1);
    expect(dto.agency).toBeNull();
    expect(dto.shipper).toBeNull();
  });

  it('breakdown 항목에서 원가 필드가 제거된다', () => {
    const dto = buildEstimateDto(full, DIRECT_SHIPPER);
    const item = dto.platform.breakdown.otherChargeItems[0] as Record<string, unknown>;
    expect(item.sellingBase).toBe(5);
    expect(item.costBase).toBeUndefined();
    expect(item.fuelSurchargeCost).toBeUndefined();
  });
});
