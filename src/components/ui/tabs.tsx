import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext<{
  value?: string;
  onValueChange?: (val: string) => void;
}>({});

export const Tabs = ({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex space-x-1 border-b border-slate-200 mb-4", className)}>
      {children}
    </div>
  );
};

export const TabsTrigger = ({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = activeValue === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange?.(value)}
      className={cn(
        "py-2.5 text-sm font-semibold border-b-2 px-4 focus:outline-none transition-all duration-250",
        isActive
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const { value: activeValue } = useContext(TabsContext);
  if (activeValue !== value) return null;
  return <div className={cn("w-full", className)}>{children}</div>;
};
