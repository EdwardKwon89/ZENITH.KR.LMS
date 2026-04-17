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
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'tactile' | 'glass' | 'ghost';
}) => {
  const variants = {
    tactile: "zen-tactile text-stone-700 font-semibold px-6 py-3 rounded-2xl active:scale-95",
    glass: "zen-glass text-blue-700 font-semibold px-6 py-3 rounded-2xl hover:bg-white/40 active:scale-95",
    ghost: "bg-transparent text-stone-500 hover:text-stone-800 transition-colors"
  };

  return (
    <button 
      className={cn(variants[variant], className)} 
      {...props}
    >
      {children}
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
      <div className="relative z-10 w-full h-full">
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
