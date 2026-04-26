"use client";

import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { ZenButton } from '@/components/ui/ZenUI';
import { VocRequestModal } from './VocRequestModal';
import { AnimatePresence } from 'framer-motion';

interface OrderVocTriggerProps {
  orderId: string;
  orderNo: string;
}

export const OrderVocTrigger: React.FC<OrderVocTriggerProps> = ({ orderId, orderNo }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ZenButton
        variant="ghost"
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all group"
      >
        <MessageSquarePlus size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-bold">VOC 접수</span>
      </ZenButton>

      <AnimatePresence>
        {isModalOpen && (
          <VocRequestModal
            orderId={orderId}
            orderNo={orderNo}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
