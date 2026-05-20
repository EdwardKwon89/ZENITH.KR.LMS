import React from 'react';
import { cn } from '@/lib/utils';

export const ZenAurora = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("relative min-h-screen w-full zen-aurora-bg overflow-hidden", className)}>
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
      <div className={cn("relative z-10 w-full h-full flex items-center justify-center", className)}>
        {children}
      </div>
    </div>
  );
};
