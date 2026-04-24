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
      color: 'blue'
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
      color: 'green'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Financial <span className="text-blue-600">Intelligence</span>
          </h1>
          <p className="text-slate-500 mt-2">ZENITH_LMS 실시간 정산 및 인보이스 대시보드</p>
        </div>
        
        <div className="flex gap-3">
           <ExportButton />
           <button className="px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95">
             <CreditCard className="w-4 h-4" />
             Bulk Settlement
           </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="group bg-white dark:bg-neutral-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-neutral-800 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-${kpi.color}-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
            
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 bg-${kpi.color}-50 dark:bg-${kpi.color}-900/10 rounded-2xl`}>
                <kpi.icon className={`w-6 h-6 text-${kpi.color}-600 dark:text-${kpi.color}-400`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${kpi.up ? 'text-green-500' : 'text-slate-400'}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : null}
                {kpi.trend}
              </div>
            </div>
            
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.title}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
              {kpi.value}
            </h3>
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
           {/* Revenue Insight Chart Simulation */}
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Monthly Trend
                </h3>
                
                <div className="flex items-end justify-between h-40 gap-2 mb-6">
                   {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                     <div key={i} className="flex-1 bg-white/10 rounded-t-lg group relative cursor-pointer hover:bg-blue-500/50 transition-all duration-300" style={{ height: `${h}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {h * 100} USD
                        </div>
                     </div>
                   ))}
                </div>
                
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                  <span>Sun</span>
                </div>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="bg-white dark:bg-neutral-900/50 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 p-8">
              <h3 className="font-bold mb-6">Settlement Health</h3>
              <div className="space-y-4">
                 <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">Auto-Settlement</span>
                    <span className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">API Connector</span>
                    <span className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold">Rate Engine</span>
                    <span className="w-3 h-3 bg-orange-500 rounded-full" />
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
