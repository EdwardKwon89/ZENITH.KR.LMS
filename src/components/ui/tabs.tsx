import React, { useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext<{ value: string; onValueChange: (value: string) => void } | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be used within <Tabs>');
  return context;
}

export function Tabs({ value, onValueChange, children, className }: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex border-b border-slate-200 mb-4", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { value: activeValue, onValueChange } = useTabs();
  const isActive = activeValue === value;
  return (
    <button
      onClick={() => onValueChange(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors",
        isActive
          ? "text-slate-900 border-b-2 border-slate-900"
          : "text-slate-500 hover:text-slate-700",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { value: activeValue } = useTabs();
  if (activeValue !== value) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
