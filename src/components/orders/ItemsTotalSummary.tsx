import React from 'react';
import { sumItemAmountByCurrency, type PackageAmountInput } from '@/lib/orders/item-totals';

interface ItemsTotalSummaryProps {
  packages: PackageAmountInput[] | null | undefined;
  className?: string;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${currency}`;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * 품목 (수량 × 단가) 통화별 소계 요약. 부모의 text 색상을 상속해
 * 다크/라이트 배경 모두에서 사용할 수 있다. 합계가 없으면 렌더링하지 않는다.
 */
export default function ItemsTotalSummary({ packages, className }: ItemsTotalSummaryProps) {
  const rows = Object.entries(sumItemAmountByCurrency(packages));
  if (rows.length === 0) return null;

  return (
    <div className={className} data-testid="items-total-summary">
      <p className="text-[9px] font-bold tracking-tight mb-0.5 opacity-60">품목 총금액</p>
      {rows.map(([currency, amount]) => (
        <p
          key={currency}
          className="text-lg font-black leading-tight whitespace-nowrap"
          data-currency={currency}
        >
          {formatCurrencyAmount(amount, currency)}
        </p>
      ))}
    </div>
  );
}
