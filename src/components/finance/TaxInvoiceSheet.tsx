"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, FileText, Clock, AlertCircle, Eye, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { getTaxInvoiceHistory, issueTaxInvoice, sendTaxInvoiceEmail } from '@/app/actions/finance';
import { ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TaxInvoiceTemplate } from './TaxInvoiceTemplate';

interface TaxInvoiceSheetProps {
  invoiceId: string;
  invoiceNo: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TaxInvoiceSheet: React.FC<TaxInvoiceSheetProps> = ({
  invoiceId,
  invoiceNo,
  isOpen,
  onClose
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadHistory();
    }
  }, [isOpen, invoiceId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTaxInvoiceHistory(invoiceId);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || '이력을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    setActionLoading(true);
    try {
      const result = await issueTaxInvoice(invoiceId);
      if (result.success) {
        toast.success('세금계산서가 발행되었습니다.');
        loadHistory();
      }
    } catch (err: any) {
      toast.error(`발행 실패: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async (tx: any) => {
    setActionLoading(true);
    try {
      const result = await sendTaxInvoiceEmail(tx.id, tx.recipient_email);
      if (result.success) {
        toast.success(`${tx.recipient_email}로 이메일이 발송되었습니다.`);
        loadHistory();
      }
    } catch (err: any) {
      toast.error(`발송 실패: ${err.message}`);
    } finally {
      setActionLoading(false);
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
            onClick={() => previewData ? setPreviewData(null) : onClose()}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Mail className="w-6 h-6 text-primary-600" />
                  Tax Invoice Management
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
                  Linked to Invoice: {invoiceNo}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200/50 rounded-2xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Quick Actions */}
              <div className="p-6 bg-primary-50/30 rounded-[2rem] border border-primary-100 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-primary-900">Issue New Tax Invoice</h4>
                  <p className="text-[11px] text-primary-600 font-bold uppercase tracking-tight">Generate standard tax data based on costs</p>
                </div>
                <ZenButton 
                  variant="tactile" 
                  onClick={handleIssue}
                  loading={actionLoading}
                  className="rounded-2xl px-6"
                >
                  Issue Now
                </ZenButton>
              </div>

              {/* History List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Issuance & Sending History</h4>
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-400">Loading history...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <FileText className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-300 uppercase italic">No tax invoices issued for this order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((tx) => (
                      <div 
                        key={tx.id}
                        className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{tx.tax_invoice_no}</span>
                              <ZenBadge 
                                variant={tx.status === 'SENT' ? 'success' : tx.status === 'FAILED' ? 'danger' : 'info'}
                                className="px-2 py-0.5 text-[9px] font-black uppercase"
                              >
                                {tx.status}
                              </ZenBadge>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
                              <Clock className="w-3 h-3" />
                              {format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ZenButton 
                              variant="tactile" 
                              className="p-2.5 rounded-xl border-slate-100"
                              onClick={() => setPreviewData(tx)}
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </ZenButton>
                            <ZenButton 
                              variant="tactile" 
                              className="p-2.5 rounded-xl bg-primary-50/50 border-primary-100 text-primary-600 hover:bg-primary-600 hover:text-white"
                              onClick={() => handleSendEmail(tx)}
                              loading={actionLoading}
                              disabled={tx.status === 'SENT'}
                              title="Send Email"
                            >
                              <Send className="w-4 h-4" />
                            </ZenButton>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="text-[11px] text-slate-500">
                            <span className="font-bold">To:</span> {tx.recipient_email}
                          </div>
                          <div className="text-sm font-black text-slate-900">
                            KRW {Number(tx.total_amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Preview Modal (Overlay on top of sheet) */}
            <AnimatePresence>
              {previewData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[110] bg-white flex flex-col"
                >
                  <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md">
                    <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Document Preview</h4>
                    <button 
                      onClick={() => setPreviewData(null)}
                      className="p-2 hover:bg-slate-100 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50">
                    <TaxInvoiceTemplate data={{
                      ...previewData,
                      grand_total: previewData.total_amount // Mapping
                    }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/30">
              <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                  Important: Tax invoices are legal financial documents. <br/>
                  Issuing multiple times will generate new serial numbers. <br/>
                  Resending email will use the most recent Resend API configuration.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
