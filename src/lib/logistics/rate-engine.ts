/**
 * ZENITH_LMS: 스마트 물류 요율 산출 엔진
 * 
 * 주어진 중량(Weight)과 요율 카드(Rate Card)의 중량별 슬랩(Slab) 정보를 기반으로
 * 적용할 단가(Unit Price)를 산출합니다.
 */

export interface RateTier {
  weight_min: number;
  unit_price: number;
}

/**
 * 중량에 맞는 요율 티어를 찾아 단가를 반환합니다.
 * @param weight 대상 중량 (kg)
 * @param tiers 요율 티어 리스트
 * @returns 적용 단가 ($/kg). 매칭되는 티어가 없는 경우 기본값 0 또는 에러 처리
 */
export function calculateSlabRate(weight: number, tiers: RateTier[]): number {
  if (!tiers || tiers.length === 0) return 0;

  // 1. weight_min 기준 내림차순 정렬 (가장 큰 구간부터 매칭)
  const sortedTiers = [...tiers].sort((a, b) => b.weight_min - a.weight_min);

  // 2. 입력 중량보다 작거나 같은 weight_min을 가진 첫 번째 티어 반환
  const matchingTier = sortedTiers.find(tier => weight >= tier.weight_min);

  return matchingTier ? matchingTier.unit_price : tiers[0].unit_price;
}

/**
 * 요율 버전 관리 유효성 검사 (유효기간 중첩 방지 등 - 향후 확장용)
 */
export function validateRateOverlap(existingRanges: { start: Date, end: Date }[], newRange: { start: Date, end: Date }): boolean {
  return existingRanges.some(range => {
    return (newRange.start <= range.end && newRange.end >= range.start);
  });
}
