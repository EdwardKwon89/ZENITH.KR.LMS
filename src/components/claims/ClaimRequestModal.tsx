"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/ZenUI';
import { createClaim } from '@/app/actions/claims';
import { toast } from 'sonner';

interface ClaimRequestModalProps {
  orderId: string;
  orderNo: string;
  onClose: () => void;
}

export const ClaimRequestModal: React.FC<ClaimRequestModalProps> = ({ orderId, orderNo, onClose }) => {
  const t = useTranslations('Claims');
  const [reasonCode, setReasonCode] = useState<'DELAY' | 'DAMAGE' | 'MISDELIVERY'>('DELAY');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error(t('description_label') + ' is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await createClaim({
        order_id: orderId,
        reason_code: reasonCode,
        description: description,
      });
      toast.success(t('success_register'));
      onClose();
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(t('error_register') + ': ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-neutral-800"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center bg-slate-50/50 dark:bg-neutral-800/30">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={24} className="text-orange-500" />
              {t('register_title')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
              Order: <span className="font-mono text-blue-600 dark:text-blue-400">{orderNo}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
            <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
              {t('register_desc')}
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 dark:text-neutral-300 block ml-1">
              {t('reason_label')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['DELAY', 'DAMAGE', 'MISDELIVERY'] as const).map((code) => (
                <button
                  key={code}
                  onClick={() => setReasonCode(code)}
                  className={`
                    py-3 px-2 rounded-2xl border-2 text-xs font-bold transition-all
                    ${reasonCode === code
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-neutral-800 border-slate-100 dark:border-neutral-800 text-slate-500 hover:border-slate-300 dark:hover:border-neutral-700'
                    }
                  `}
                >
                  {t(`reason_${code.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-neutral-300 block ml-1">
              {t('description_label')}
            </label>
            <ZenTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="클레임에 대한 구체적인 내용을 입력해 주세요..."
              className="min-h-[120px] rounded-2xl"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 dark:bg-neutral-800/50 border-t border-slate-100 dark:border-neutral-800 flex gap-3">
          <ZenButton
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold"
          >
            {t('Common.cancel' as any) || 'Cancel'}
          </ZenButton>
          <ZenButton
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-2 py-3 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? '...' : (t('Common.submit' as any) || t('submit'))}
          </ZenButton>
        </div>
      </motion.div>
    </div>
  );
};
