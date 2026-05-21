"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { OrderStatus, ORDER_STATUS_META } from '@/types/orders';
import { updateOrderStatus } from '@/app/actions/orders';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface StatusChangeModalProps {
  orderId: string;
  currentStatus: OrderStatus;
  allowedNextStatuses: OrderStatus[];
  onClose: () => void;
  onSuccess: () => void;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  orderId,
  currentStatus,
  allowedNextStatuses,
  onClose,
  onSuccess
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('orderStatus');

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    
    setIsSubmitting(true);
    try {
      await updateOrderStatus(orderId, selectedStatus, reason);
      toast.success('상태가 성공적으로 업데이트되었습니다.', {
        icon: <CheckCircle2 className="text-green-500" />
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('상태 업데이트 실패', {
        description: err.message,
        icon: <AlertCircle className="text-red-500" />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg"
      >
        <ZenCard className="relative overflow-hidden border-white/20 shadow-2xl">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">상태 변경</h3>
            <p className="text-sm text-slate-500 mt-1">오더의 다음 생명주기 단계를 선택해주세요.</p>
          </div>

          <div className="space-y-4">
            {/* 현재 상태 표시 */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Info size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</p>
                <p className="text-sm font-bold text-slate-700">{ORDER_STATUS_META[currentStatus] ? t(ORDER_STATUS_META[currentStatus].labelKey) : currentStatus}</p>
              </div>
            </div>

            {/* 선택 가능한 다음 상태 목록 */}
            <div className="grid grid-cols-2 gap-2">
              {allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all ${
                    selectedStatus === status 
                      ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-500/10' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${ORDER_STATUS_META[status]?.color}`}>
                    {ORDER_STATUS_META[status] ? t(ORDER_STATUS_META[status].labelKey) : status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium leading-tight">
                    {ORDER_STATUS_META[status] ? t(ORDER_STATUS_META[status].descriptionKey) : status}
                  </span>
                </button>
              ))}
            </div>

            {/* 사유 입력 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">변경 사유 (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="상태 변경 사유를 입력해주세요..."
                className="w-full text-sm p-3 border border-slate-200 rounded-2xl bg-white/50 focus:ring-2 focus:ring-blue-100 focus:outline-none min-h-[80px] resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-8">
            <ZenButton 
              variant="ghost" 
              onClick={onClose} 
              className="flex-1 rounded-2xl"
            >
              취소
            </ZenButton>
            <ZenButton 
              variant="tactile" 
              className="flex-1 bg-slate-900 text-white rounded-2xl disabled:bg-slate-300"
              disabled={!selectedStatus || isSubmitting}
              loading={isSubmitting}
              onClick={handleUpdate}
            >
              상태 업데이트
            </ZenButton>
          </div>
        </ZenCard>
      </motion.div>
    </div>
  );
};
