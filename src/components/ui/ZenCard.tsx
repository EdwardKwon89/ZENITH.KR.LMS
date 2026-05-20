import React from 'react';
import { cn } from '@/lib/utils';

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
