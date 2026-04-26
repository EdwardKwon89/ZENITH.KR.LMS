"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, History, FileDown, MoreHorizontal, CheckCircle2, Clock } from 'lucide-react';
import { ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { InvoiceHistorySheet } from './InvoiceHistorySheet';
import { TaxInvoiceSheet } from './TaxInvoiceSheet';
import { issueInvoicePdf } from '@/app/actions/finance';
import { toast } from 'sonner';

interface InvoiceTableProps {
  invoices: any[];
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; no: string } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTaxSheetOpen, setIsTaxSheetOpen] = useState(false);
  const [issuingIds, setIssuingIds] = useState<Set<string>>(new Set());

  const handleIssuePdf = async (invoiceId: string) => {
    if (issuingIds.has(invoiceId)) return;
    
    setIssuingIds(prev => new Set(prev).add(invoiceId));
    try {
      const result = await issueInvoicePdf(invoiceId);
      if (result.success) {
        toast.success('PDF가 성공적으로 발행되었습니다.');
      }
    } catch (error: any) {
      toast.error(`발행 실패: ${error.message}`);
    } finally {
      setIssuingIds(prev => {
        const next = new Set(prev);
        next.delete(invoiceId);
        return next;
      });
    }
  };

  const openHistory = (id: string, no: string) => {
    setSelectedInvoice({ id, no });
    setIsHistoryOpen(true);
  };

  const openTaxInvoice = (id: string, no: string) => {
    setSelectedInvoice({ id, no });
    setIsTaxSheetOpen(true);
  };

  return (
    <div className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Recent Invoices
        </h2>
        <button className="text-xs font-bold text-blue-600 hover:underline">View All Invoices</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-neutral-800">
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No.</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-neutral-800">
            {invoices && invoices.length > 0 ? (
              invoices.map((inv) => (
                <tr key={inv.id} className="group hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="py-5 font-mono text-sm text-slate-600 dark:text-slate-400">
                    {inv.invoice_no}
                  </td>
                  <td className="py-5 text-sm text-slate-500">
                    {format(new Date(inv.created_at), 'yyyy.MM.dd')}
                  </td>
                  <td className="py-5 font-black text-slate-900 dark:text-white">
                    {inv.currency} {Number(inv.total_amount).toLocaleString()}
                  </td>
                  <td className="py-5">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        inv.status === 'PAID' 
                          ? 'bg-green-50 text-green-600 border-green-100' 
                          : inv.status === 'UNPAID'
                          ? 'bg-orange-50 text-orange-600 border-orange-100'
                          : 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <ZenButton 
                        variant="tactile" 
                        className="p-2 rounded-xl border-slate-100"
                        onClick={() => openHistory(inv.id, inv.invoice_no)}
                        title="PDF History"
                      >
                        <History className="w-4 h-4" />
                      </ZenButton>
                      <ZenButton 
                        variant="tactile" 
                        className="p-2 rounded-xl border-slate-100 bg-amber-50/50 text-amber-600 hover:bg-amber-600 hover:text-white"
                        onClick={() => openTaxInvoice(inv.id, inv.invoice_no)}
                        title="Tax Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </ZenButton>
                      <ZenButton 
                        variant="tactile" 
                        className="p-2 rounded-xl bg-blue-50/50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
                        onClick={() => handleIssuePdf(inv.id)}
                        loading={issuingIds.has(inv.id)}
                        title="Issue PDF"
                      >
                        <FileDown className="w-4 h-4" />
                      </ZenButton>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400 italic">
                  No invoices generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <>
          <InvoiceHistorySheet
            invoiceId={selectedInvoice.id}
            invoiceNo={selectedInvoice.no}
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
          />
          <TaxInvoiceSheet
            invoiceId={selectedInvoice.id}
            invoiceNo={selectedInvoice.no}
            isOpen={isTaxSheetOpen}
            onClose={() => setIsTaxSheetOpen(false)}
          />
        </>
      )}
    </div>

  );
};
