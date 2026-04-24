"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Clock, AlertCircle } from 'lucide-react';
import { getInvoicePdfHistory } from '@/app/actions/finance';
import { ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { format } from 'date-fns';

interface InvoiceHistorySheetProps {
  invoiceId: string;
  invoiceNo: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceHistorySheet: React.FC<InvoiceHistorySheetProps> = ({
  invoiceId,
  invoiceNo,
  isOpen,
  onClose
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadHistory();
    }
  }, [isOpen, invoiceId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoicePdfHistory(invoiceId);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || '이력을 불러오는 중 오류가 발생했습니다.');
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  PDF Issuance History
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
                  Invoice: {invoiceNo}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-slate-400 animate-pulse">Loading history...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 opacity-20 grayscale">
                  <FileText className="w-16 h-16 mb-4" />
                  <p className="text-sm font-black italic uppercase">No PDFs issued yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ZenBadge variant="info" className="px-2 py-0.5 text-[10px] font-black">
                            V{item.version}
                          </ZenBadge>
                          <span className="text-[13px] font-bold text-slate-900">
                            {item.metadata?.currency} {item.metadata?.total_amount?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm')}
                        </div>
                      </div>
                      
                      <a 
                        href={item.download_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="no-underline"
                      >
                        <ZenButton 
                          variant="tactile" 
                          className="p-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-none border-slate-200"
                        >
                          <Download className="w-4 h-4" />
                        </ZenButton>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/30">
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                PDF versions are archived for audit purposes. <br/>
                Downloading a PDF generates a secure, temporary link.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
