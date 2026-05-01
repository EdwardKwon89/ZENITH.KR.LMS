"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { format } from 'date-fns';
import { updatePaymentStatus } from '@/app/actions/finance';
import { toast } from 'sonner';

interface ConfirmPaymentModalProps {
  invoiceId: string;
  invoiceNo: string;
  totalAmount: number;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  invoiceId,
  invoiceNo,
  totalAmount,
  currency,
  onClose,
  onSuccess
}) => {
  const [paidAmount, setPaidAmount] = useState<string>(totalAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CARD' | 'CASH'>('BANK_TRANSFER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const amount = parseFloat(paidAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("유효한 입금 금액을 입력해주세요.");
      }

      await updatePaymentStatus(invoiceId, 'PAID', amount);
      
      toast.success('입금 확인이 완료되었습니다.', {
        description: `${invoiceNo} - 결제 상태가 PAID로 변경되었습니다.`,
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('입금 처리 실패', {
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
        className="w-full max-w-md"
      >
        <ZenCard className="relative overflow-hidden border-white/30 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-white/90 backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10" />
          
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <CreditCard className="text-blue-600" size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Confirm Payment</h3>
            <p className="text-sm text-slate-500 font-medium">관리자 전용: 무통장 입금 내역을 최종 확인합니다.</p>
          </div>

          <div className="space-y-6">
            {/* 인보이스 요약 정보 */}
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Invoice No</span>
                <span className="text-sm font-bold text-slate-900">{invoiceNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Billing Amount</span>
                <span className="text-lg font-black text-blue-600">{currency} ${totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* 실제 입금액 입력 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                <DollarSign size={12} /> Actual Paid Amount
              </label>
              <ZenInput 
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="입금액을 입력하세요"
                className="text-lg font-bold"
              />
            </div>

            {/* 결제 수단 선택 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                <Calendar size={12} /> Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['BANK_TRANSFER', 'CARD', 'CASH'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 text-[10px] font-black rounded-xl border transition-all ${
                      paymentMethod === method 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
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
              disabled={isSubmitting}
              loading={isSubmitting}
              onClick={handleConfirm}
            >
              Approve Payment
            </ZenButton>
          </div>
        </ZenCard>
      </motion.div>
    </div>
  );
};
