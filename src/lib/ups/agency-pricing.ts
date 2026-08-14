// UPS Agency 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Issue #310: rate_overrides 폐기, Zone별 할인율 단일 파라미터로 대체
// DEF-B-033: 할인율은 기본운임에만 적용, 부가운임(유류할증+급증수수료+기타)은 정가 그대로
// pass-through — Shipper 단계(shipper-pricing.ts)와 동일 원칙으로 통일(2026-07-29)
// TASK-B-302 (Issue #1123): 기존 Math.round(x*100)/100 → ceilByCurrency(통화별 올림)로 교체.
//
// agencyCost = baseSellingPrice x (1 - zoneDiscountRate) + fuelSurcharge + otherCharges + surgeFee + agencyOtherChargesCost
// agencySellingPrice = 위와 동일하되 agencyOtherCharges는 selling 기준

import type { UpsAgencyFreightResult } from '@/types/ups';
import { ceilByCurrency } from '@/lib/ups/pricing-engine';

export interface AgencyOtherChargeAmount {
  sellingPrice: number;
  costPrice: number;
}

export interface AgencyFreightInput {
  baseSellingPrice: number;
  fuelSurchargeSellingAmount: number;
  otherChargesSellingTotal: number;
  surgeFeeSellingAmount: number;
  discountRate: number;
  agencyOtherCharges: AgencyOtherChargeAmount[];
  currency: string;
}

export function computeAgencyFreight(input: AgencyFreightInput): UpsAgencyFreightResult {
  const agencyChargesSellingTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.sellingPrice, 0);
  const agencyChargesCostTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.costPrice, 0);

  const discountedBase = ceilByCurrency(input.baseSellingPrice * (1 - input.discountRate), input.currency);
  const passthroughTotal = input.fuelSurchargeSellingAmount + input.otherChargesSellingTotal + input.surgeFeeSellingAmount;
  const platformSellingTotal = input.baseSellingPrice + passthroughTotal;

  return {
    baseSellingPrice: discountedBase,
    fuelSurchargeSellingAmount: input.fuelSurchargeSellingAmount,
    otherChargesSellingTotal: input.otherChargesSellingTotal,
    surgeFeeSellingAmount: input.surgeFeeSellingAmount,
    platformSellingTotal,
    agencyCostPrice: ceilByCurrency(discountedBase + passthroughTotal + agencyChargesCostTotal, input.currency),
    agencySellingPrice: ceilByCurrency(discountedBase + passthroughTotal + agencyChargesSellingTotal, input.currency),
    discountRate: input.discountRate,
    agencyOtherChargesTotal: agencyChargesSellingTotal,
  };
}
