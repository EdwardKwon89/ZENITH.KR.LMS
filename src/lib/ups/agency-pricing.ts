// UPS Agency 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Phase 7.1 TASK-173 IMP-145 · An-14 §2 R3~R5
//
// agencyCost = platformSellingTotal x (1 - discount_rate) + agencyOtherCharges(배송건당)  ※ R3·R4
// agencySellingPrice = agencyCost + agencyMargin (= zen_agency_rate_overrides.selling_price, Agency 자율 입력) ※ R5
//
// cost_price 산출은 zen_agency_rate_overrides의 DB 트리거(trg_agency_rate_override_calc_cost)가
// 최종 권위(source of truth)다. 이 함수는 오더 등록 시점의 견적 미리보기 + 등록된 override가
// 아직 없는 대리점을 위한 폴백 계산용으로 동일 공식을 재사용한다(§7 트리거-TS 교차검증 대상).

import type { UpsAgencyFreightResult } from '@/types/ups';

export interface AgencyOtherChargeAmount {
  sellingPrice: number;
  costPrice: number;
}

export interface AgencyFreightInput {
  platformSellingTotal: number;
  discountRate: number;
  overrideSellingPrice: number | null;
  overrideCostPrice: number | null;
  agencyOtherCharges: AgencyOtherChargeAmount[];
}

export function computeAgencyFreight(input: AgencyFreightInput): UpsAgencyFreightResult {
  const agencyChargesSellingTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.sellingPrice, 0);
  const agencyChargesCostTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.costPrice, 0);

  const hasOverride = input.overrideSellingPrice !== null && input.overrideCostPrice !== null;

  const baseCost = hasOverride
    ? input.overrideCostPrice!
    : input.platformSellingTotal * (1 - input.discountRate);

  // 등록된 override(마진 반영 selling_price)가 없으면 마진 0으로 폴백 — Agency에게 요율 등록을 유도하는 안내용 값.
  const baseSelling = hasOverride ? input.overrideSellingPrice! : baseCost;

  return {
    platformSellingTotal: input.platformSellingTotal,
    agencyCostPrice: Math.round((baseCost + agencyChargesCostTotal) * 100) / 100,
    agencySellingPrice: Math.round((baseSelling + agencyChargesSellingTotal) * 100) / 100,
    discountRate: input.discountRate,
    agencyOtherChargesTotal: agencyChargesSellingTotal,
    source: hasOverride ? 'override' : 'platform_fallback',
  };
}
