import React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open, onOpenChange }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange?.(false)}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-slate-900">{children}</h2>;
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>;
}
