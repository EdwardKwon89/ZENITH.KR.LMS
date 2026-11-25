import type { UpsAgencyFreightResult, UpsShipperFreightResult, UpsOtherChargeItem } from '@/types/ups';
import type { UpsFreightEstimate } from './estimate-core';

/**
 * TASK-B-373 PR-2 — 견적 응답 DTO.
 * 서버가 세션 역할·소속으로 범위를 결정하고, 클라이언트에는 허용된 단계만 전달한다.
 */

export interface EstimateOtherChargeItemDto {
  chargeId: string;
  chargeCode: string;
  chargeName: string;
  unit: string;
  sellingBase: number;
  fuelSurchargeSelling: number;
  /** 원가 계열 — 관리자에게만 포함 */
  costBase?: number;
  fuelSurchargeCost?: number;
}

export interface EstimateBreakdownDto {
  zone: { zone_code: string; zone_name: string } | null;
  product: { product_code: string; product_name: string; cargo_type: string };
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  volumetricDivisor: number;
  billingWeightKg: number;
  otherChargeItems: EstimateOtherChargeItemDto[];
  oversizeApplied: boolean;
  fallbackApplied?: boolean;
  nonDocRateApplied?: boolean;
  // 원가 계열(관리자 한정)
  baseRateId?: string;
  baseCostPrice?: number;
  costSurchargeRate?: number;
  fuelSurchargeId?: string | null;
  fuelSurchargeRate?: number;
  fuelSurchargeCostAmount?: number;
  otherChargesCostTotal?: number;
  surgeFeeId?: string | null;
  surgeFeeSellingRatePerKg?: number;
  surgeFeeCostAmount?: number;
  baseSellingPrice?: number;
  fuelSurchargeSellingAmount?: number;
  otherChargesSellingTotal?: number;
  surgeFeeSellingAmount?: number;
}

export interface EstimatePlatformDto {
  chargeableWeightKg: number;
  billingWeightKg: number;
  currency: string;
  breakdown: EstimateBreakdownDto;
  /** 단계별 판매가 계열 — 허용되지 않은 단계에서는 null */
  baseSellingPrice: number | null;
  fuelSurchargeSellingAmount: number | null;
  otherChargesSellingTotal: number | null;
  surgeFeeSellingAmount: number | null;
  totalSellingPrice: number | null;
  /** 원가 계열 — 관리자에게만 포함 */
  baseCostPrice?: number;
  fuelSurchargeCostAmount?: number;
  otherChargesCostTotal?: number;
  surgeFeeCostAmount?: number;
  totalCostPrice?: number;
}

export interface UpsFreightEstimateDto {
  platform: EstimatePlatformDto;
  agency: UpsAgencyFreightResult | null;
  shipper: UpsShipperFreightResult | null;
}

export interface EstimateAccess {
  /** 원가 계열 포함(관리자) */
  includeCost: boolean;
  /** 플랫폼 판매가 계열 포함(관리자·대리점·비소속 화주) */
  includePlatformSelling: boolean;
  includeAgency: boolean;
  includeShipper: boolean;
  /** 부가항목 행(판매 금액) 포함 — 소속 화주도 화주 청구 단계 금액으로 표시 동일성 유지 */
  includeChargeItems: boolean;
}

function sanitizeItems(items: UpsOtherChargeItem[] | undefined, includeCost: boolean): EstimateOtherChargeItemDto[] {
  return (items ?? []).map((item) => ({
    chargeId: item.chargeId,
    chargeCode: item.chargeCode,
    chargeName: item.chargeName,
    unit: item.unit,
    sellingBase: item.sellingBase,
    fuelSurchargeSelling: item.fuelSurchargeSelling,
    ...(includeCost ? { costBase: item.costBase, fuelSurchargeCost: item.fuelSurchargeCost } : {}),
  }));
}

export function buildEstimateDto(full: UpsFreightEstimate, access: EstimateAccess): UpsFreightEstimateDto {
  const { platform } = full;
  const b = platform.breakdown;

  const breakdown: EstimateBreakdownDto = {
    zone: b.zone ? { zone_code: b.zone.zone_code, zone_name: b.zone.zone_name } : null,
    product: { product_code: b.product.product_code, product_name: b.product.product_name, cargo_type: b.product.cargo_type },
    actualWeightKg: b.actualWeightKg,
    volumetricWeightKg: b.volumetricWeightKg,
    chargeableWeightKg: b.chargeableWeightKg,
    volumetricDivisor: b.volumetricDivisor,
    billingWeightKg: b.billingWeightKg,
    otherChargeItems: access.includeChargeItems ? sanitizeItems(b.otherChargeItems, access.includeCost) : [],
    oversizeApplied: b.oversizeApplied,
    fallbackApplied: b.fallbackApplied,
    nonDocRateApplied: b.nonDocRateApplied,
  };

  if (access.includePlatformSelling) {
    breakdown.baseSellingPrice = b.baseSellingPrice;
    breakdown.fuelSurchargeSellingAmount = b.fuelSurchargeSellingAmount;
    breakdown.otherChargesSellingTotal = b.otherChargesSellingTotal;
    breakdown.surgeFeeSellingAmount = b.surgeFeeSellingAmount;
  }

  if (access.includeCost) {
    breakdown.baseRateId = b.baseRateId;
    breakdown.baseCostPrice = b.baseCostPrice;
    breakdown.costSurchargeRate = b.costSurchargeRate;
    breakdown.fuelSurchargeId = b.fuelSurchargeId;
    breakdown.fuelSurchargeRate = b.fuelSurchargeRate;
    breakdown.fuelSurchargeCostAmount = b.fuelSurchargeCostAmount;
    breakdown.otherChargesCostTotal = b.otherChargesCostTotal;
    breakdown.surgeFeeId = b.surgeFeeId;
    breakdown.surgeFeeSellingRatePerKg = b.surgeFeeSellingRatePerKg;
    breakdown.surgeFeeCostAmount = b.surgeFeeCostAmount;
  }

  const platformDto: EstimatePlatformDto = {
    chargeableWeightKg: platform.chargeableWeightKg,
    billingWeightKg: platform.billingWeightKg,
    currency: platform.currency,
    breakdown,
    baseSellingPrice: access.includePlatformSelling ? platform.baseSellingPrice : null,
    fuelSurchargeSellingAmount: access.includePlatformSelling ? platform.fuelSurchargeSellingAmount : null,
    otherChargesSellingTotal: access.includePlatformSelling ? platform.otherChargesSellingTotal : null,
    surgeFeeSellingAmount: access.includePlatformSelling ? platform.surgeFeeSellingAmount : null,
    totalSellingPrice: access.includePlatformSelling ? platform.totalSellingPrice : null,
  };

  if (access.includeCost) {
    platformDto.baseCostPrice = platform.baseCostPrice;
    platformDto.fuelSurchargeCostAmount = platform.fuelSurchargeCostAmount;
    platformDto.otherChargesCostTotal = platform.otherChargesCostTotal;
    platformDto.surgeFeeCostAmount = platform.surgeFeeCostAmount;
    platformDto.totalCostPrice = platform.totalCostPrice;
  }

  return {
    platform: platformDto,
    agency: access.includeAgency ? full.agency : null,
    shipper: access.includeShipper ? full.shipper : null,
  };
}
