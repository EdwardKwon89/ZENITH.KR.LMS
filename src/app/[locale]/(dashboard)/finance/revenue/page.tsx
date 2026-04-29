import { getRevenueReport, getOrganizations } from "@/app/actions/finance";
import { requireAdmin } from "@/lib/auth/guards";
import { TrendingUp, FileText, Users, DollarSign, Download } from "lucide-react";
import { ZenCard, ZenButton, ZenBadge } from "@/components/ui/ZenUI";
import RevenueFilterBar from "@/components/finance/RevenueFilterBar";
import ExportButton from "@/components/finance/ExportButton";
import Link from "next/link";

export default async function RevenueReportPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearch = await searchParams;
  await requireAdmin();

  // 1. 기본 필터 값 설정 (최근 1개월)
  const defaultStart = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const defaultEnd = new Date().toISOString().split('T')[0];

  const filters = {
    startDate: typeof resolvedSearch.startDate === 'string' ? resolvedSearch.startDate : defaultStart,
    endDate: typeof resolvedSearch.endDate === 'string' ? resolvedSearch.endDate : defaultEnd,
    transMode: typeof resolvedSearch.mode === 'string' ? resolvedSearch.mode : 'ALL',
    shipperId: typeof resolvedSearch.shipperId === 'string' ? resolvedSearch.shipperId : undefined,
  };

  // 2. 데이터 페칭
  const [reportData, organizations] = await Promise.all([
    getRevenueReport(filters),
    getOrganizations()
  ]);

  const { items, summary } = reportData;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-2xl shadow-blue-200/50 transform -rotate-3">
            <TrendingUp size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Revenue Analysis</h1>
            <p className="text-slate-500 font-semibold text-sm opacity-80 uppercase tracking-widest">Financial Reporting & Revenue Tracking</p>
          </div>
        </div>

        <div className="flex gap-3">
          <ExportButton 
            data={items} 
            filename={`revenue_report_${filters.startDate}_${filters.endDate}`}
            type="REVENUE"
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ZenCard className="bg-gradient-to-br from-white/80 to-blue-50/30 border-blue-100/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100/80 text-blue-700 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-900">
                  {summary.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-400">USD</p>
              </div>
            </div>
          </div>
        </ZenCard>

        <ZenCard className="bg-gradient-to-br from-white/80 to-indigo-50/30 border-indigo-100/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100/80 text-indigo-700 rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice Count</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-900">
                  {summary.count.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-400">Cases</p>
              </div>
            </div>
          </div>
        </ZenCard>

        <ZenCard className="bg-gradient-to-br from-white/80 to-emerald-50/30 border-emerald-100/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Ticket Size</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-900">
                  {Math.round(summary.avgRevenue).toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-400">USD</p>
              </div>
            </div>
          </div>
        </ZenCard>
      </div>

      {/* Filter Bar */}
      <RevenueFilterBar organizations={organizations} locale={locale} />

      {/* Data Table Section */}
      <ZenCard className="p-0 overflow-hidden border-white/40 shadow-2xl bg-white/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/5 border-b border-slate-200/60">
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Invoice No</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Shipper</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Transport Mode</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    No revenue records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/60 transition-colors group">
                    <td className="px-6 py-4">
                      <Link 
                        href={`/${locale}/finance/invoices/${item.id}`}
                        className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2"
                      >
                        {item.invoice_no}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{(item.shipper as any)?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ZenBadge variant="info" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1">
                        {(item.order as any)?.trans_mode}
                      </ZenBadge>
                    </td>
                    <td className="px-6 py-4">
                      <ZenBadge 
                        variant={item.status === 'PAID' ? 'success' : 'warning'}
                        className="px-3 py-1 font-bold"
                      >
                        {item.status}
                      </ZenBadge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-slate-900">
                        {item.total_amount.toLocaleString()} <span className="text-[10px] text-slate-400 ml-0.5">{item.currency}</span>
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-xs font-semibold text-slate-500">
                        {new Date(item.created_at).toLocaleDateString(locale)}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ZenCard>
    </div>
  );
}
