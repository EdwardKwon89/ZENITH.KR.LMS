"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { addIncidentFee } from '@/app/actions/claims';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface IncidentFeeModalProps {
  claimId: string;
  invoices: {
    id: string;
    invoice_no: string;
    total_amount: number;
    currency: string;
  }[];
  onClose: () => void;
  onSuccess: () => void;
}

export const IncidentFeeModal: React.FC<IncidentFeeModalProps> = ({
  claimId,
  invoices,
  onClose,
  onSuccess
}) => {
  const t = useTranslations('Claims');
  const [invoiceId, setInvoiceId] = useState<string>(invoices[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedInvoice = invoices.find(inv => inv.id === invoiceId);

  const handleConfirm = async () => {
    if (!invoiceId || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const feeAmount = parseFloat(amount);
      if (isNaN(feeAmount) || feeAmount <= 0) {
        throw new Error("유효한 금액을 입력해주세요.");
      }

      if (selectedInvoice && feeAmount > selectedInvoice.total_amount) {
        if (!confirm(`입력한 비용($${feeAmount.toLocaleString()})이 인보이스 총액($${selectedInvoice.total_amount.toLocaleString()})보다 큽니다. 계속하시겠습니까?`)) {
          return;
        }
      }

      await addIncidentFee({
        claim_id: claimId,
        invoice_id: invoiceId,
        fee_amount: feeAmount,
        currency: selectedInvoice?.currency || 'USD',
        description
      });
      
      toast.success(t('success_fee'), {
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Registration failed', {
        description: err.message,
        icon: <AlertCircle className="text-red-500" />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const newTotal = selectedInvoice ? selectedInvoice.total_amount - (parseFloat(amount) || 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="w-full max-w-md"
      >
        <ZenCard className="relative overflow-hidden border-white/30 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-white/90 backdrop-blur-xl">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="mb-8">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <DollarSign className="text-rose-600" size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('add_fee')}</h3>
            <p className="text-sm text-slate-500 font-medium">사고 비용을 등록하고 인보이스 금액을 차감합니다.</p>
          </div>

          <div className="space-y-6">
            {/* 인보이스 선택 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                <FileText size={12} /> Target Invoice
              </label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all font-bold"
              >
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_no} ({inv.currency} ${inv.total_amount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* 비용 입력 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <DollarSign size={12} /> Fee Amount ({selectedInvoice?.currency})
                </label>
                {selectedInvoice && (
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${newTotal < 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                    Est. New Total: ${newTotal.toLocaleString()}
                  </span>
                )}
              </div>
              <ZenInput 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg font-bold"
              />
            </div>

            {/* 상세 설명 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all text-sm min-h-[100px]"
                placeholder="비용 발생 사유 등을 입력하세요."
              />
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
              className="flex-1 bg-rose-600 text-white shadow-lg hover:bg-rose-700 font-black rounded-2xl"
              disabled={isSubmitting || invoices.length === 0}
              loading={isSubmitting}
              onClick={handleConfirm}
            >
              Register Fee
            </ZenButton>
          </div>
        </ZenCard>
      </motion.div>
    </div>
  );
};
