// Pure data — no server-only imports. Safe for client components.

const COST_TYPE_LABELS: Record<string, string> = {
  BASE_FREIGHT: '기본운임',
  FUEL_SURCHARGE: '유류할증료',
  SURGE_FEE: '급증 긴급 수수료',
  OTHER_CHARGE: '기타 부가운임',
  FREIGHT: '운임',
};

export function getCostTypeLabel(costType: string): string {
  return COST_TYPE_LABELS[costType] || costType.replace(/_/g, ' ');
}
