// UPS Shipper 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Phase 7.1 TASK-173 IMP-145 · An-14 §2 R6
//
// finalFreight = agencySellingPrice x (1 - shipper_discount_rate)
// shipper_discount_rate 출처: zen_agency_shippers.discount_rate (기존 컬럼, 계산 로직에서 최초로 소비됨)

import type { UpsShipperFreightResult } from '@/types/ups';

export function computeShipperFreight(
  agencySellingPrice: number,
  shipperDiscountRate: number
): UpsShipperFreightResult {
  return {
    agencySellingPrice,
    shipperDiscountRate,
    finalFreight: Math.round(agencySellingPrice * (1 - shipperDiscountRate) * 100) / 100,
  };
}
