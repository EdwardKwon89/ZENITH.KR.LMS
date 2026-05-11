import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ZenCard: Ethereal Glassmorphism Container
 */
export const ZenCard = ({ 
  children, 
  className, 
  hoverEffect = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { 
  children: React.ReactNode; 
  className?: string;
  hoverEffect?: boolean;
}) => {
  return (
    <div 
      className={cn(
        "zen-glass rounded-2xl p-6 transition-all duration-300",
        hoverEffect && "hover:shadow-xl hover:-translate-y-0.5 hover:border-white/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * ZenButton: Tactile Neomorphic Interaction
 */
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
    tactile: "zen-tactile text-stone-700 font-semibold px-6 py-3 rounded-xl active:scale-95 disabled:opacity-50",
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


/**
 * ZenAurora: Background Aurora Container
 */
export const ZenAurora = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  return (
    <div className={cn("relative min-h-screen w-full zen-aurora-bg overflow-hidden", className)}>
      {/* Subtle overlay to soften the gradients */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
      <div className={cn("relative z-10 w-full h-full flex items-center justify-center", className)}>
        {children}
      </div>
    </div>
  );
};

/**
 * ZenInput: Soft UI / Neomorphic Input
 */
export const ZenInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean | string }>(
  ({ className, error, ...props }, ref) => {
    return (
      <input 
        ref={ref}
        className={cn(
          "w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl",
          "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all",
          error && "border-rose-500 ring-rose-500/20 shadow-rose-100 rotate-[0.2deg]", // Error state aesthetic
          className
        )}
        {...props}
      />
    );
  }
);
ZenInput.displayName = "ZenInput";


/**
 * ZenTextarea: Soft UI / Neomorphic Textarea
 */
export const ZenTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean | string }>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea 
        ref={ref}
        className={cn(
          "w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl",
          "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all",
          error && "border-rose-500 ring-rose-500/20 shadow-rose-100", 
          className
        )}
        {...props}
      />
    );
  }
);
ZenTextarea.displayName = "ZenTextarea";


/**
 * ZenBadge: Visual Status Indicator
 */
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

/**
 * ZenSelect: Soft UI Select Component
 */
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
