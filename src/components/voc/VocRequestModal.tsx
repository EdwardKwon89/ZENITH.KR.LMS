"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, AlertCircle, CheckCircle2, Clock, Package, HelpCircle } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/ZenUI';
import { createVoc, VocType } from '@/app/actions/voc';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface VocRequestModalProps {
  orderId: string;
  orderNo: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const VOC_TYPES: { value: VocType; labelKey: string; icon: any; color: string }[] = [
  { value: 'DELAY', labelKey: 'type_delay', icon: Clock, color: 'text-amber-500 bg-amber-50' },
  { value: 'DAMAGE', labelKey: 'type_damage', icon: Package, color: 'text-rose-500 bg-rose-50' },
  { value: 'MISDELIVERY', labelKey: 'type_misdelivery', icon: AlertCircle, color: 'text-orange-500 bg-orange-50' },
  { value: 'OTHER', labelKey: 'type_other', icon: HelpCircle, color: 'text-slate-500 bg-slate-50' },
];

export const VocRequestModal: React.FC<VocRequestModalProps> = ({
  orderId,
  orderNo,
  onClose,
  onSuccess
}) => {
  const t = useTranslations('VOC');
  const [selectedType, setSelectedType] = useState<VocType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !title || !description) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createVoc({
        order_id: orderId,
        type: selectedType,
        title,
        description
      });
      
      toast.success(t('success_create'), {
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error('VOC 접수 실패', {
        description: err.message,
        icon: <AlertCircle className="text-red-500" />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl"
      >
        <ZenCard className="relative overflow-hidden border-white/20 shadow-2xl bg-white/90">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{t('new_voc')}</h3>
            <p className="text-sm text-slate-500 mt-1">
              Order <span className="font-bold text-blue-600">#{orderNo}</span>에 대한 불편사항을 접수해주시면 신속히 확인하겠습니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 문의 유형 선택 */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {t('type_label')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VOC_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 group",
                      selectedType === type.value 
                        ? "bg-white border-blue-500 shadow-lg shadow-blue-100 ring-2 ring-blue-500/10" 
                        : "bg-slate-50/50 border-transparent hover:border-slate-200"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", type.color)}>
                      <type.icon size={20} />
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold",
                      selectedType === type.value ? "text-blue-600" : "text-slate-500"
                    )}>
                      {t(type.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 입력 */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                문의 제목
              </label>
              <ZenInput 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력해주세요 (최대 100자)"
                maxLength={100}
                required
              />
            </div>

            {/* 내용 입력 */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {t('description_label')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상세 내용을 입력해주세요..."
                className="w-full text-sm p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-2 focus:ring-blue-400/30 focus:outline-none min-h-[120px] resize-none transition-all"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <ZenButton 
                type="button"
                variant="ghost" 
                onClick={onClose} 
                className="flex-1 rounded-2xl"
              >
                취소
              </ZenButton>
              <ZenButton 
                type="submit"
                variant="tactile" 
                className="flex-1 bg-slate-900 text-white rounded-2xl disabled:bg-slate-300 shadow-xl shadow-slate-200"
                disabled={!selectedType || !title || !description || isSubmitting}
                loading={isSubmitting}
              >
                {t('submit')}
              </ZenButton>
            </div>
          </form>
        </ZenCard>
      </motion.div>
    </div>
  );
};
