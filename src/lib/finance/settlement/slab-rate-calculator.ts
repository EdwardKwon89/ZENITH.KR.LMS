import { calculateSlabRate } from '../../logistics/rate-engine';

export class SlabRateCalculator {
  /**
   * Chargeable Weight와 Rate Card의 Tiers를 바탕으로 슬랩 요율(단가)을 산출합니다.
   * tiers가 없을 경우 unit_price의 BigDecimal 형식을 파싱하여 단가를 결정합니다.
   */
  calculateUnitPrice(bestRate: any, chargeableWeight: number): number {
    if (bestRate.tiers?.weight_slabs && bestRate.tiers.weight_slabs.length > 0) {
      return calculateSlabRate(chargeableWeight, bestRate.tiers.weight_slabs);
    }
    
    // unit_price가 객체형(Int, Exp)인 경우 변환 처리
    if (
      typeof bestRate.unit_price === 'object' &&
      bestRate.unit_price !== null &&
      'Int' in bestRate.unit_price
    ) {
      return Number(bestRate.unit_price.Int) * Math.pow(10, bestRate.unit_price.Exp);
    }
    
    return Number(bestRate.unit_price);
  }
}
