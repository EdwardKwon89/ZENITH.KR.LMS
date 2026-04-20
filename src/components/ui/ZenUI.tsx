import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ZenCard: Ethereal Glassmorphism Container
 */
export const ZenCard = ({ 
  children, 
  className, 
  hoverEffect = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  hoverEffect?: boolean;
}) => {
  return (
    <div className={cn(
      "zen-glass rounded-3xl p-6 transition-all duration-300",
      hoverEffect && "hover:shadow-2xl hover:border-white/50",
      className
    )}>
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
    tactile: "zen-tactile text-stone-700 font-semibold px-6 py-3 rounded-2xl active:scale-95 disabled:opacity-50",
    glass: "zen-glass text-blue-700 font-semibold px-6 py-3 rounded-2xl hover:bg-white/40 active:scale-95 disabled:opacity-50",
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
export const ZenInput = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input 
      className={cn(
        "w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl",
        "shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all",
        className
      )}
      {...props}
    />
  );
};

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
