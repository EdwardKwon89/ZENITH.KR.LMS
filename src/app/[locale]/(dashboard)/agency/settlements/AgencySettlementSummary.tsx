'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AgencySettlementSummaryProps {
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginRate: number;
}

export function AgencySettlementSummary({
  orderCount,
  totalRevenue,
  totalCost,
  totalMargin,
  marginRate,
}: AgencySettlementSummaryProps) {
  const t = useTranslations('AgencySettlements');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* 총 오더수 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">{t('summary_orders')}</span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag size={20} />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-3xl font-black text-slate-900">{orderCount}</span>
          <span className="text-sm text-slate-400 ml-1">{t('unit_orders')}</span>
        </div>
      </div>

      {/* 매출 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">{t('summary_revenue')}</span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight size={20} />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue)}</span>
        </div>
      </div>

      {/* 매입 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">{t('summary_cost')}</span>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight size={20} />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-2xl font-black text-slate-900">{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {/* 마진 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">{t('summary_margin')}</span>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatCurrency(totalMargin)}</span>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
              {marginRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
