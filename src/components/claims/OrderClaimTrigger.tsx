"use client";

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ZenButton } from '@/components/ui/ZenUI';
import { ClaimRequestModal } from './ClaimRequestModal';
import { AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface OrderClaimTriggerProps {
  orderId: string;
  orderNo: string;
}

export const OrderClaimTrigger: React.FC<OrderClaimTriggerProps> = ({ orderId, orderNo }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations('Claims');

  return (
    <>
      <ZenButton
        variant="ghost"
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all group"
      >
        <AlertTriangle size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-bold">{t('register_title')}</span>
      </ZenButton>

      <AnimatePresence>
        {isModalOpen && (
          <ClaimRequestModal
            orderId={orderId}
            orderNo={orderNo}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
