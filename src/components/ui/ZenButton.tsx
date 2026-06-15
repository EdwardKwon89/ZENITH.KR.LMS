import React from 'react';
import { cn } from '@/lib/utils';

export const ZenButton = ({
  children,
  className,
  variant = 'tactile',
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'tactile' | 'glass' | 'ghost';
  loading?: boolean;
}) => {
  const variants = {
    tactile: "bg-white zen-tactile text-stone-700 font-semibold px-6 py-3 rounded-xl active:scale-95 disabled:opacity-50",
    glass: "zen-glass text-brand-700 font-semibold px-6 py-3 rounded-xl hover:bg-white/40 active:scale-95 disabled:opacity-50",
    ghost: "bg-transparent text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50"
  };

  return (
    <button
      className={cn(variants[variant], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </div>
    </button>
  );
};
