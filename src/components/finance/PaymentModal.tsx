"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Building2, CreditCard, CheckCircle2 } from 'lucide-react';
import { ZenButton } from '@/components/ui/ZenUI';
import { payInvoiceFromWallet } from '@/app/actions/wallet';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNo,
  amount,
  currency,
  onSuccess
}) => {
  const t = useTranslations('Wallet');
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'WALLET' | 'BANK_TRANSFER'>('WALLET');

  const handlePayment = async () => {
    setLoading(true);
    try {
      if (selectedMethod === 'WALLET') {
        const result = await payInvoiceFromWallet(invoiceId);
        if (result.success) {
          toast.success(t('success_pay'));
          onSuccess();
          onClose();
        } else {
          toast.error(result.error || t('insufficient_balance'));
        }
      } else {
        // Bank transfer - for now just info
        toast.info('Please transfer to the bank account and notify us.');
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[151] overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-brand-600" />
                  Checkout
                </h3>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Pay</p>
                <p className="text-3xl font-black text-slate-900">
                  <span className="text-sm font-bold mr-1 text-slate-500">{currency}</span>
                  {amount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 font-medium">Invoice: {invoiceNo}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Payment Method</h4>
                
                <div 
                  onClick={() => setSelectedMethod('WALLET')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                    selectedMethod === 'WALLET' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${selectedMethod === 'WALLET' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">Zenith Wallet</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Instant settlement from balance</p>
                  </div>
                  {selectedMethod === 'WALLET' && <CheckCircle2 className="w-5 h-5 text-brand-600" />}
                </div>

                <div 
                  onClick={() => setSelectedMethod('BANK_TRANSFER')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                    selectedMethod === 'BANK_TRANSFER' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${selectedMethod === 'BANK_TRANSFER' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">Bank Transfer</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Manual confirmation (1-2 days)</p>
                  </div>
                  {selectedMethod === 'BANK_TRANSFER' && <CheckCircle2 className="w-5 h-5 text-brand-600" />}
                </div>
              </div>

              <ZenButton 
                onClick={handlePayment}
                loading={loading}
                className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                Confirm Payment
              </ZenButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
