// UPS Shipper 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Issue #310: Admin 판매가에서 Zone별 할인율로 직접 계산 (Agency 원가 경유 안 함)
//
// finalFreight = platformSellingPrice x (1 - shipperZoneDiscountRate)
// shipperZoneDiscountRate 출처: zen_agency_shipper_zone_discounts.discount_rate

import type { UpsShipperFreightResult } from '@/types/ups';

export function computeShipperFreight(
  platformSellingPrice: number,
  shipperZoneDiscountRate: number
): UpsShipperFreightResult {
  return {
    platformSellingPrice,
    shipperDiscountRate: shipperZoneDiscountRate,
    finalFreight: Math.round(platformSellingPrice * (1 - shipperZoneDiscountRate) * 100) / 100,
  };
}
