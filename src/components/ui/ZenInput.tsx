import React from 'react';
import { cn } from '@/lib/utils';

export const ZenInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean | string }>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl",
          "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all",
          error && "border-rose-500 ring-rose-500/20 shadow-rose-100 rotate-[0.2deg]",
          className
        )}
        {...props}
      />
    );
  }
);
ZenInput.displayName = "ZenInput";
