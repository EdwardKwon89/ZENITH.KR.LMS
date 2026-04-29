"use client";

import React, { useState } from 'react';
import { Package, MessageCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderMainTabsProps {
  cargoDetails: React.ReactNode;
  supportSection: React.ReactNode;
  initialTab?: 'cargo' | 'support';
}

export function OrderMainTabs({ 
  cargoDetails, 
  supportSection,
  initialTab = 'cargo'
}: OrderMainTabsProps) {
  const [activeTab, setActiveTab] = useState<'cargo' | 'support'>(initialTab);

  const tabs = [
    { id: 'cargo', label: 'Cargo Details', icon: Package },
    { id: 'support', label: 'Customer Support', icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Premium Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-neutral-900/50 backdrop-blur-md rounded-[1.25rem] w-fit border border-slate-200/50 dark:border-neutral-800/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative flex items-center gap-2 px-6 py-2.5 rounded-[1rem] text-sm font-bold transition-all duration-300 outline-none",
                isActive 
                  ? "text-brand-600 dark:text-brand-400" 
                  : "text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-slate-200/50 dark:hover:bg-neutral-800/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white dark:bg-neutral-800 shadow-sm rounded-[1rem] border border-slate-200/50 dark:border-neutral-700/50"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={18} className={cn("relative z-10", isActive ? "text-brand-500" : "text-slate-400")} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Animation */}
      <div className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8 shadow-sm overflow-hidden relative min-h-[450px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === 'cargo' ? cargoDetails : supportSection}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
