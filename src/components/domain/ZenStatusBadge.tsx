'use client';

import { useTranslations } from 'next-intl';
import { ORDER_STATUS_META, OrderStatus } from '@/types/orders';
import { cn } from '@/lib/utils';

interface ZenStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
  showDescription?: boolean;
  size?: 'sm' | 'md';
  title?: string;
}

const sizeStyles = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function ZenStatusBadge({
  status,
  className,
  clickable,
  onClick,
  showDescription,
  size = 'sm',
  title,
}: ZenStatusBadgeProps) {
  const t = useTranslations('orderStatus');
  const meta = ORDER_STATUS_META[status];

  if (!meta) {
    return (
      <span
        className={cn(
          // TASK-1146 (Issue #1221, DEF-139): 배지 내부 개행 방지 (테이블은 overflow-x-auto)
          'font-bold border rounded whitespace-nowrap',
          sizeStyles[size],
          'bg-slate-100 text-slate-600 border-slate-200',
          className,
        )}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        // TASK-1146 (Issue #1221, DEF-139): 배지 내부 개행 방지 (테이블은 overflow-x-auto)
        'font-bold border whitespace-nowrap',
        sizeStyles[size],
        meta.color,
        clickable && 'cursor-pointer hover:ring-2 hover:ring-offset-1 ring-blue-400 transition-all',
        className,
      )}
      onClick={onClick}
      title={title ?? (showDescription ? t(meta.descriptionKey) : undefined)}
    >
      {t(meta.labelKey)}
    </span>
  );
}
