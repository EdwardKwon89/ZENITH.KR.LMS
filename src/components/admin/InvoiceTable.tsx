"use client";

import React, { useState } from 'react';
import { format } from "date-fns";
import { ConfirmPaymentModal } from "@/components/admin/ConfirmPaymentModal";
import { ZenButton } from "@/components/ui/ZenUI";
import { useRouter } from "next/navigation";
import { AnimatePresence } from 'framer-motion';
import { FileText, History, Download, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { issueInvoicePdf, finalizeInvoice } from '@/app/actions/finance';
import { InvoiceHistorySheet } from '@/components/finance/InvoiceHistorySheet';

interface InvoiceTableProps {
  invoices: any[];
  isAdmin: boolean;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, isAdmin }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<any | null>(null);
  const [finalizeInvoiceData, setFinalizeInvoiceData] = useState<any | null>(null);
  const [finalizeReason, setFinalizeReason] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const handleIssuePdf = async (invoiceId: string) => {
    setIssuingId(invoiceId);
    try {
      const result = await issueInvoicePdf(invoiceId);
      if (result.success) {
        toast.success('인보이스 PDF가 성공적으로 발행되었습니다.');
        setHistoryInvoice(invoices.find(inv => inv.id === invoiceId));
      }
    } catch (err: any) {
      toast.error(`발행 실패: ${err.message}`);
    } finally {
      setIssuingId(null);
    }
  };

  const handleFinalize = async () => {
    if (!finalizeInvoiceData) return;
    setFinalizing(true);
    try {
      const result = await finalizeInvoice(finalizeInvoiceData.id, finalizeReason || undefined);
      if (result.success) {
        toast.success('정산이 마감되었습니다.');
        setFinalizeInvoiceData(null);
        setFinalizeReason('');
        router.refresh();
      } else {
        toast.error(result.error || '정산 마감 실패');
      }
    } catch (err: any) {
      toast.error(`정산 마감 실패: ${err.message}`);
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <>
      <div className="bg-white zen-tactile border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice No</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Shipper</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Due Date</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <span className="text-4xl">📄</span>
                      <p className="text-sm font-bold italic">No settlement records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-[14px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{inv.invoice_no}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[13px] font-bold text-slate-700">{inv.shipper?.name}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-900">${Number(inv.total_amount).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{inv.currency}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[12px] font-bold text-slate-500">{format(new Date(inv.due_date), 'MMM dd, yyyy')}</span>
                    </td>
                    <td className="px-8 py-5">
                      {(() => {
                        const styleMap: any = {
                          UNPAID: 'bg-amber-50 text-amber-600 border-amber-200',
                          PAID: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                          OVERDUE: 'bg-rose-50 text-rose-600 border-rose-200',
                        };
                        return (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border tracking-wider ${styleMap[inv.status]}`}>
                            {inv.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                       {isAdmin && inv.status !== 'PAID' && !inv.is_finalized && (
                        <ZenButton 
                          onClick={() => setFinalizeInvoiceData(inv)}
                          className="px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-xl hover:bg-emerald-700 transition-all hover:shadow-lg hover:shadow-emerald-500/25"
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Finalize
                        </ZenButton>
                      )}
                       {isAdmin && inv.status !== 'PAID' && (
                        <ZenButton 
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/25"
                        >
                          Confirm Payment
                        </ZenButton>
                      )}
                      {isAdmin && (
                        <ZenButton 
                          onClick={() => handleIssuePdf(inv.id)}
                          loading={issuingId === inv.id}
                          className="px-4 py-1.5 bg-slate-700 text-white text-[11px] font-bold rounded-xl hover:bg-blue-600 transition-all hover:shadow-lg hover:shadow-blue-500/25"
                        >
                          <FileText className="w-3 h-3" />
                          Issue PDF
                        </ZenButton>
                      )}
                      <button 
                        onClick={() => setHistoryInvoice(inv)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceHistorySheet
        invoiceId={historyInvoice?.id}
        invoiceNo={historyInvoice?.invoice_no}
        isOpen={!!historyInvoice}
        onClose={() => setHistoryInvoice(null)}
      />

      <AnimatePresence>
        {finalizeInvoiceData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 mx-4">
              <h3 className="text-lg font-bold text-slate-900 mb-2">정산 마감</h3>
              <p className="text-sm text-slate-600 mb-4">
                <strong>{finalizeInvoiceData.invoice_no}</strong> 인보이스를 마감하시겠습니까?
                마감 후에는 자동 갱신이 차단되며, 추가 조정 시 별도의 인보이스가 발행됩니다.
              </p>
              {isAdmin && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    사유 (예외 처리 시 필수)
                  </label>
                  <textarea
                    value={finalizeReason}
                    onChange={e => setFinalizeReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    rows={3}
                    placeholder="예외 처리 사유를 입력하세요..."
                  />
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <ZenButton
                  onClick={() => { setFinalizeInvoiceData(null); setFinalizeReason(''); }}
                  className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200"
                >
                  취소
                </ZenButton>
                <ZenButton
                  onClick={handleFinalize}
                  loading={finalizing}
                  className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
                >
                  마감 확정
                </ZenButton>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedInvoice && (
          <ConfirmPaymentModal
            invoiceId={selectedInvoice.id}
            invoiceNo={selectedInvoice.invoice_no}
            totalAmount={Number(selectedInvoice.total_amount)}
            currency={selectedInvoice.currency}
            onClose={() => setSelectedInvoice(null)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
};
