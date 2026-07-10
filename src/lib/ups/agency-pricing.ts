// UPS Agency 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Issue #310: rate_overrides 폐기, Zone별 할인율 단일 파라미터로 대체
//
// agencyCost = platformSellingTotal x (1 - zoneDiscountRate) + agencyOtherCharges
// agencySellingPrice = agencyCost + agencyMargin (Agency 등록한 부가요금 selling 합산)

import type { UpsAgencyFreightResult } from '@/types/ups';

export interface AgencyOtherChargeAmount {
  sellingPrice: number;
  costPrice: number;
}

export interface AgencyFreightInput {
  platformSellingTotal: number;
  discountRate: number;
  agencyOtherCharges: AgencyOtherChargeAmount[];
}

export function computeAgencyFreight(input: AgencyFreightInput): UpsAgencyFreightResult {
  const agencyChargesSellingTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.sellingPrice, 0);
  const agencyChargesCostTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.costPrice, 0);

  const baseCost = input.platformSellingTotal * (1 - input.discountRate);

  return {
    platformSellingTotal: input.platformSellingTotal,
    agencyCostPrice: Math.round((baseCost + agencyChargesCostTotal) * 100) / 100,
    agencySellingPrice: Math.round((baseCost + agencyChargesSellingTotal) * 100) / 100,
    discountRate: input.discountRate,
    agencyOtherChargesTotal: agencyChargesSellingTotal,
  };
}
