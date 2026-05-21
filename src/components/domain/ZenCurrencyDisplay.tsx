'use client';

import { cn } from '@/lib/utils';

interface ZenCurrencyDisplayProps {
  amount: number;
  currency: string;
  variant?: 'currency' | 'code-suffix' | 'code-prefix';
  className?: string;
  currencyClassName?: string;
}

export function ZenCurrencyDisplay({
  amount,
  currency,
  variant = 'code-suffix',
  className,
  currencyClassName,
}: ZenCurrencyDisplayProps) {
  if (variant === 'currency') {
    return (
      <span className={className}>
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount)}
      </span>
    );
  }

  if (variant === 'code-prefix') {
    return (
      <span className={cn('whitespace-nowrap', className)}>
        <span className={cn('text-[10px] text-slate-400 font-bold uppercase', currencyClassName)}>
          {currency}
        </span>
        {' '}
        {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    );
  }

  return (
    <span className={cn('whitespace-nowrap', className)}>
      {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      {' '}
      <span className={cn('text-[10px] text-slate-400 font-bold uppercase', currencyClassName)}>
        {currency}
      </span>
    </span>
  );
}
