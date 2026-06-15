import React from 'react';
import { cn } from '@/lib/utils';

export const ZenInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & { error?: boolean | string; label?: string; size?: 'sm' | 'md' | 'lg' | number }>(
  ({ className, error, label, size = 'md', ...props }, ref) => {
    const inputSize = typeof size === 'number' ? size : undefined;
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-lg",
      md: "px-4 py-3 rounded-2xl",
      lg: "px-6 py-4 text-base rounded-2xl"
    };
    const sizeClass = typeof size === 'string' ? sizeClasses[size] : "px-4 py-3 rounded-2xl";

    const inputEl = (
      <input
        ref={ref}
        size={inputSize}
        className={cn(
          "w-full bg-slate-50/50 backdrop-blur-sm border border-white/20",
          sizeClass,
          "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all",
          error && "border-rose-500 ring-rose-500/20 shadow-rose-100 rotate-[0.2deg]",
          className
        )}
        {...props}
      />
    );

    if (label) {
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-semibold text-slate-500">{label}</label>
          {inputEl}
        </div>
      );
    }

    return inputEl;
  }
);
ZenInput.displayName = "ZenInput";
