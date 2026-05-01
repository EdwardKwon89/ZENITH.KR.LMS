"use client";

import React, { useState } from 'react';
import { format } from "date-fns";
import { ConfirmPaymentModal } from "@/components/admin/ConfirmPaymentModal";
import { ZenButton } from "@/components/ui/ZenUI";
import { useRouter } from "next/navigation";
import { AnimatePresence } from 'framer-motion';
import { FileText, History, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { issueInvoicePdf } from '@/app/actions/finance';
import { InvoiceHistorySheet } from '@/components/finance/InvoiceHistorySheet';

interface InvoiceTableProps {
  invoices: any[];
  isAdmin: boolean;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, isAdmin }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<any | null>(null);
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
