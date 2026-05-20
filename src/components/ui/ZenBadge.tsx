import React from 'react';
import { cn } from '@/lib/utils';

export const ZenBadge = ({
  children,
  className,
  variant = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) => {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    danger: "bg-rose-100 text-rose-800 border-rose-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
