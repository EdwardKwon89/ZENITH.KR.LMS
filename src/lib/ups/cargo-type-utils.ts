// Issue #1027 / DEF-B-040: cargo_type 할인율 폴백 유틸리티
// freight.ts의 candidateCargoTypes 패턴과 동일

/**
 * 상품 cargo_type에 대한 할인율 정책 후보 순서(구체적 값 우선 → ALL 폴백).
 * JSJung 확정 규칙:
 *   - DOC 상품     → ['DOC', 'ALL']
 *   - NON_DOC 상품 → ['NON_DOC', 'ALL']
 *   - BOTH(Expedited/Flight) → ['NON_DOC', 'ALL'] (DOC 정책은 적용 대상 아님)
 * 반환 배열 앞쪽일수록 우선순위가 높으며, 배열 순서로 "구체적 값 우선, 없으면 ALL" 폴백을 보장한다.
 */
export function candidateCargoTypes(productCargoType?: string): string[] {
  if (productCargoType === 'DOC') return ['DOC', 'ALL'];
  if (productCargoType === 'NON_DOC') return ['NON_DOC', 'ALL'];
  // BOTH(Expedited/Flight): NON_DOC 우선, ALL 폴백 (DOC는 후보 아님)
  return ['NON_DOC', 'ALL'];
}

/**
 * discountRateMap에서 candidateCargoTypes 우선순위로 할인율 조회
 */
export function resolveDiscountRate(
  zoneRates: Record<string, number> | undefined,
  productCargoType?: string
): number {
  if (!zoneRates) return 0;
  const candidates = candidateCargoTypes(productCargoType);
  return candidates.map(ct => zoneRates[ct]).find(r => r !== undefined) ?? 0;
}
