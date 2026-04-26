import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { InvoiceTable } from '@/components/finance/InvoiceTable';
import { ExportButton } from '@/components/finance/ExportButton';
import { RevenueChart } from '@/components/finance/RevenueChart';
import { Download, TrendingDown, LayoutDashboard } from 'lucide-react';
import { getWeeklyRevenueChart } from '@/app/actions/finance';

export default async function FinanceDashboardPage() {
  const { supabase, profile } = await requireAuth();

  // 1. 재무 요약 데이터 가져오기 (실제 DB 연동)
  const { data: invoices } = await supabase
    .from('zen_invoices')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: costs } = await supabase
    .from('zen_order_costs')
    .select('*')
    .eq('is_revenue', true);

  const totalRevenue = costs?.reduce((sum, c) => sum + Number(c.total_amount), 0) || 0;
  const unpaidAmount = invoices?.filter(i => i.status === 'UNPAID')
    .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0;
  const paidAmount = invoices?.filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0;

  const kpis = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      trend: '+12.5%',
      up: true,
      icon: DollarSign,
      color: 'brand'
    },
    {
      title: 'Unpaid Invoices',
      value: `$${unpaidAmount.toLocaleString()}`,
      trend: '4 pending',
      up: false,
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'Collection Rate',
      value: totalRevenue > 0 ? `${Math.round((paidAmount / totalRevenue) * 100)}%` : '0%',
      trend: '+2.1%',
      up: true,
      icon: CheckCircle2,
      color: 'emerald'
    }
  ];

  // 2. 차트용 데이터 가공 (실제 DB 연동)
  const chartData = await getWeeklyRevenueChart();

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">재무 현황</h1>
            <p className="text-slate-500 text-sm font-medium">Real-time revenue & expense tracking</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</span>
            <span className="text-xl font-black text-slate-900">$1,284,500.00</span>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>
          <ExportButton />
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="group zen-glass p-8 rounded-2xl border border-white/20 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-brand-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
            
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 bg-brand-50 rounded-2xl`}>
                <kpi.icon className={`w-6 h-6 text-brand-600`} />
              </div>
              {kpi.up ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {kpi.trend}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-black">
                  <Clock className="w-3.5 h-3.5" />
                  {kpi.trend}
                </div>
              )}
            </div>
            
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">{kpi.title}</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-black text-slate-900">{kpi.value}</h2>
                <span className="text-slate-400 text-xs font-medium">USD</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Invoices List */}
        <div className="lg:col-span-8">
          <InvoiceTable invoices={invoices || []} />
        </div>

        {/* Financial Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           {/* Revenue Insight Chart Implementation */}
           <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-600/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-400" />
                  Monthly Trend
                </h3>
                <p className="text-slate-400 text-xs mb-6">Revenue analytics for last 7 days</p>
                
                <RevenueChart data={chartData} />
              </div>
           </div>

           {/* Quick Actions */}
           <div className="zen-glass rounded-2xl border border-white/20 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <h3 className="font-bold mb-6 text-slate-900">Settlement Health</h3>
              <div className="space-y-4">
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">Auto-Settlement</span>
                    <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">API Connector</span>
                    <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">Rate Engine</span>
                    <span className="w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]" />
                 </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-6 text-center">
                System status is normal. 1 maintenance scheduled.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
