export interface ItemAmountInput {
  quantity?: number | null;
  unit_price?: number | null;
  currency?: string | null;
}

export interface PackageAmountInput {
  items?: ItemAmountInput[] | null;
}

const DEFAULT_CURRENCY = 'USD';

function toNonNegativeNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num;
}

function normalizeCurrency(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toUpperCase();
  }
  return DEFAULT_CURRENCY;
}

/**
 * 품목별 (수량 × 단가)를 통화별로 합산한다.
 *
 * - 통화별 소계(환산 없음): USD/KRW 등이 섞이면 통화마다 별도 키로 반환.
 * - quantity/unit_price 가 null·undefined·NaN·음수이면 0으로 처리.
 * - currency 가 비어 있으면 기존 화면 동작과 동일하게 USD 로 간주.
 * - 입력 객체는 변경하지 않는다(불변).
 */
export function sumItemAmountByCurrency(
  packages: PackageAmountInput[] | null | undefined
): Record<string, number> {
  const totals: Record<string, number> = {};
  if (!Array.isArray(packages)) return totals;

  for (const pkg of packages) {
    const items = pkg?.items;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const amount = toNonNegativeNumber(item?.quantity) * toNonNegativeNumber(item?.unit_price);
      if (amount === 0) continue;

      const currency = normalizeCurrency(item?.currency);
      totals[currency] = (totals[currency] ?? 0) + amount;
    }
  }

  return totals;
}
