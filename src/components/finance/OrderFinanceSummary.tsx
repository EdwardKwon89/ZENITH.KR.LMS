'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  DollarSign, 
  AlertCircle,
  ArrowRight,
  Download
} from 'lucide-react';
import { calculateSettlementAction, generateInvoiceAction, generateInvoicePdf, addManualOrderCost } from '@/app/actions/finance';
import { getCostTypeLabel } from '@/lib/finance/settlement/cost-type-labels';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface CostItem {
  id: string;
  cost_type: string;
  total_amount: number;
  currency: string;
}

interface Invoice {
  id: string;
  invoice_no: string;
  total_amount: number;
  status: string;
}

interface OrderFinanceSummaryProps {
  orderId: string;
  initialCosts: CostItem[];
  initialInvoice: Invoice | null;
  incidentFees?: any[];
  isAdmin: boolean;
  canManageFinance?: boolean;
}

export default function OrderFinanceSummary({ 
  orderId, 
  initialCosts, 
  initialInvoice,
  incidentFees = [],
  isAdmin,
  canManageFinance
}: OrderFinanceSummaryProps) {
  const canManage = canManageFinance !== undefined ? canManageFinance : isAdmin;
  const t = useTranslations('Finance');
  const [costs, setCosts] = useState<CostItem[]>(initialCosts);
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [manualCostName, setManualCostName] = useState('');
  const [manualCostAmount, setManualCostAmount] = useState('');
  const [manualCostCurrency, setManualCostCurrency] = useState('');
  const [isAddingCost, setIsAddingCost] = useState(false);

  const totalEst = costs.reduce((sum, item) => sum + Number(item.total_amount), 0);

  const handleRecalculate = async () => {
    if (!isAdmin) return;
    
    setIsCalculating(true);
    try {
      const result = await calculateSettlementAction(orderId) as any;
      if (result.success) {
        setCosts(result.costs || []);
        toast.success('Settlement recalculated successfully');
      } else {
        toast.error(result.message || result.error || 'Failed to recalculate settlement');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!isAdmin || invoice) return;

    setIsInvoicing(true);
    try {
      const result = await generateInvoiceAction(orderId) as any;
      if (result.success) {
        setInvoice(result.invoice);
        toast.success(`Invoice ${result.invoice.invoice_no} generated`);
      } else {
        toast.error(result.message || result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsInvoicing(false);
    }
  };

  const handlePdfDownload = async () => {
    setIsPdfLoading(true);
    try {
      const { fileUrl } = await generateInvoicePdf(orderId);
      window.open(fileUrl, '_blank');
    } catch {
      toast.error(t('pdf_generate_error'));
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
      {/* Decorative Background */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between border-b border-slate-700 pb-6 mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Settlement Preview
          </h3>
          {canManage && (
            <button 
              onClick={handleRecalculate}
              disabled={isCalculating || !!invoice}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-30"
              title="Recalculate Costs"
            >
              {isCalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {costs.length > 0 ? (
            costs.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-slate-400 text-sm">
                <span>{getCostTypeLabel(item.cost_type)}</span>
                <span className="text-white font-mono">
                  {item.currency} {Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-slate-500 text-xs italic">
              No costs calculated yet. Click recalculate.
            </div>
          )}

          {/* Incident Fees (Claims) */}
          {incidentFees.length > 0 && (
            <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Financial Adjustments (Claims)</p>
              {incidentFees.map((fee) => (
                <div key={fee.id} className="flex justify-between items-center text-rose-400 text-sm">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {fee.description || 'Claim Settlement'}
                  </span>
                  <span className="font-mono">
                    -{fee.currency} {Number(fee.fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Manual Cost Input (not invoiced only) */}
          {canManage && !invoice && (
            <div className="pt-4 mt-4 border-t border-slate-700/50 space-y-3">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Add Manual Charge</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={manualCostName}
                  onChange={(e) => setManualCostName(e.target.value)}
                  placeholder="Charge name"
                  className="col-span-1 px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  value={manualCostAmount}
                  onChange={(e) => setManualCostAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  value={manualCostCurrency}
                  onChange={(e) => setManualCostCurrency(e.target.value)}
                  placeholder="KRW"
                  className="px-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={async () => {
                  if (!manualCostName || !manualCostAmount || !manualCostCurrency) return;
                  setIsAddingCost(true);
                  try {
                    const result = await addManualOrderCost(orderId, manualCostName, Number(manualCostAmount), manualCostCurrency);
                    if (result.success) {
                      toast.success('Manual charge added');
                      setManualCostName('');
                      setManualCostAmount('');
                      setManualCostCurrency('');
                      // Refresh costs
                      const refreshed = await calculateSettlementAction(orderId) as any;
                      if (refreshed.success) setCosts(refreshed.costs || []);
                    }
                  } catch (e: any) {
                    toast.error(e.message || 'Failed to add charge');
                  } finally {
                    setIsAddingCost(false);
                  }
                }}
                disabled={isAddingCost || !manualCostName || !manualCostAmount || !manualCostCurrency}
                className="w-full py-2 text-xs font-bold text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl disabled:opacity-30 transition-colors"
              >
                {isAddingCost ? 'Adding...' : 'Add Charge'}
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Estimated</p>
              <span className="text-3xl font-black text-blue-400 font-mono tracking-tighter">
                ${totalEst.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            {invoice ? (
              <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Invoiced</span>
              </div>
            ) : null}
          </div>
        </div>

        {canManage && !invoice && (
          <button 
            onClick={handleGenerateInvoice}
            disabled={isInvoicing || costs.length === 0}
            className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {isInvoicing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Final Invoice
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        )}

        {invoice && (
          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('active_invoice')}</span>
              <span className="text-[10px] font-mono text-blue-400">#{invoice.invoice_no}</span>
            </div>
            <button
              onClick={handlePdfDownload}
              disabled={isPdfLoading}
              className="w-full py-2 text-xs font-bold text-blue-400 hover:text-blue-300 disabled:text-slate-600 transition-colors flex items-center justify-center gap-1"
            >
              {isPdfLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {isPdfLoading ? t('pdf_generating') : t('download_invoice_pdf')}
            </button>
          </div>
        )}

        <p className="text-[10px] text-slate-500 mt-6 text-center italic leading-relaxed">
          {invoice 
            ? 'This order has been officially invoiced.' 
            : '* Settlement preview is subject to change based on actual logistics events.'}
        </p>
      </div>
    </div>
  );
}
