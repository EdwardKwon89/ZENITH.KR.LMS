import React from 'react';
import { cn } from '@/lib/utils';

export const ZenSelect = ({
  value,
  onValueChange,
  options,
  className,
  placeholder = "Select...",
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl appearance-none",
        "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all",
        className
      )}
      {...props}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
