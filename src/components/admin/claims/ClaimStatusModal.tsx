"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ZenCard, ZenButton } from '@/components/ui/ZenUI';
import { updateClaimStatus } from '@/app/actions/claims';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ClaimStatus } from '@/types/claims';

interface ClaimStatusModalProps {
  claimId: string;
  currentStatus: ClaimStatus;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimStatusModal: React.FC<ClaimStatusModalProps> = ({
  claimId,
  currentStatus,
  onClose,
  onSuccess
}) => {
  const t = useTranslations('Claims');
  const [status, setStatus] = useState<ClaimStatus>(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statuses: ClaimStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      await updateClaimStatus(claimId, status);
      
      toast.success(t('success_update'), {
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Update failed', {
        description: err.message,
        icon: <AlertCircle className="text-red-500" />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="w-full max-w-sm"
      >
        <ZenCard className="relative overflow-hidden border-white/30 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-white/90 backdrop-blur-xl">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <ShieldCheck className="text-blue-600" size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Update Status</h3>
            <p className="text-sm text-slate-500 font-medium">클레임 처리 단계를 변경합니다.</p>
          </div>

          <div className="space-y-3">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex justify-between items-center ${
                  status === s 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                }`}
              >
                <span className="font-bold">{t(`status_${s.toLowerCase()}`)}</span>
                {status === s && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-10">
            <ZenButton 
              variant="ghost" 
              onClick={onClose} 
              className="flex-1 text-slate-400 font-bold hover:text-slate-600"
            >
              Cancel
            </ZenButton>
            <ZenButton 
              variant="tactile" 
              className="flex-1 bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 font-black rounded-2xl"
              disabled={isSubmitting || status === currentStatus}
              loading={isSubmitting}
              onClick={handleUpdate}
            >
              Update
            </ZenButton>
          </div>
        </ZenCard>
      </motion.div>
    </div>
  );
};
