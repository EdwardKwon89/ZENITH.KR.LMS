// UPS Shipper 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Issue #310: Admin 판매가에서 Zone별 할인율로 직접 계산 (Agency 원가 경유 안 함)
// Issue #457: 할인율은 기본운임에만 적용, 부가운임(유류할증+기타)은 정가 그대로
// Issue #491: 급증 긴급 수수료도 부가운임과 동일하게 할인 대상 아닌 정가 그대로 pass-through
//
// finalFreight = baseSellingPrice × (1 - shipperZoneDiscountRate) + fuelSurcharge + otherCharges + surgeFee

import type { UpsShipperFreightResult } from '@/types/ups';

export function computeShipperFreight(
  baseSellingPrice: number,
  fuelSurchargeSellingAmount: number,
  otherChargesSellingTotal: number,
  shipperZoneDiscountRate: number,
  surgeFeeSellingAmount: number = 0
): UpsShipperFreightResult {
  const discountedBase = Math.round(baseSellingPrice * (1 - shipperZoneDiscountRate) * 100) / 100;
  return {
    baseSellingPrice: discountedBase,
    fuelSurchargeSellingAmount,
    otherChargesSellingTotal,
    surgeFeeSellingAmount,
    shipperDiscountRate: shipperZoneDiscountRate,
    finalFreight: Math.round((discountedBase + fuelSurchargeSellingAmount + otherChargesSellingTotal + surgeFeeSellingAmount) * 100) / 100,
  };
}
