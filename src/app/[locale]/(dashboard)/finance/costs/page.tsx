import { getCostReport } from "@/app/actions/finance";
import { requireAdmin } from "@/lib/auth/guards";
import { TrendingDown, FileText, MapPin, Calculator, Download, ExternalLink } from "lucide-react";
import { ZenCard, ZenButton, ZenBadge } from "@/components/ui/ZenUI";
import CostFilterBar from "@/components/finance/CostFilterBar";
import ExportButton from "@/components/finance/ExportButton";
import Link from "next/link";

export default async function CostReportPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearch = await searchParams;
  await requireAdmin();

  // 1. Default Filter Values (Last 1 Month)
  const defaultStart = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const defaultEnd = new Date().toISOString().split('T')[0];

  const filters = {
    startDate: typeof resolvedSearch.startDate === 'string' ? resolvedSearch.startDate : defaultStart,
    endDate: typeof resolvedSearch.endDate === 'string' ? resolvedSearch.endDate : defaultEnd,
    serviceType: typeof resolvedSearch.serviceType === 'string' ? resolvedSearch.serviceType : 'ALL',
    route: typeof resolvedSearch.route === 'string' ? resolvedSearch.route : undefined,
  };

  // 2. Data Fetching
  const reportData = await getCostReport(filters);
  const { items, summary } = reportData;

  // Calculate highest cost route for KPI
  const routeStats = items.reduce((acc: any, item: any) => {
    const routeKey = `${item.order?.origin || 'N/A'}-${item.order?.destination || 'N/A'}`;
    acc[routeKey] = (acc[routeKey] || 0) + Number(item.total_amount);
    return acc;
  }, {});
  
  const highestRoute = Object.entries(routeStats).sort((a: any, b: any) => b[1] - a[1])[0] || ['N/A', 0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-gradient-to-br from-rose-600 to-orange-700 rounded-2xl text-white shadow-2xl shadow-rose-200/50 transform rotate-3">
            <TrendingDown size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Expense Tracking</h1>
            <p className="text-slate-500 font-semibold text-sm opacity-80 uppercase tracking-widest">Operating Costs & Vendor Payments</p>
          </div>
        </div>

        <div className="flex gap-3">
          <ExportButton 
            data={items} 
            filename={`cost_report_${filters.startDate}_${filters.endDate}`}
            type="COST"
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ZenCard className="bg-gradient-to-br from-white/80 to-rose-50/30 border-rose-100/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100/80 text-rose-700 rounded-2xl">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Operating Cost</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-900">
                  {summary.totalCost.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-400">USD</p>
              </div>
            </div>
          </div>
        </ZenCard>

        <ZenCard className="bg-gradient-to-br from-white/80 to-orange-50/30 border-orange-100/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100/80 text-orange-700 rounded-2xl">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Highest Cost Route</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-black text-slate-900">
                  {highestRoute[0]}
                </p>
                <p className="text-xs font-bold text-slate-400">({(highestRoute[1] as number).toLocaleString()} USD)</p>
              </div>
            </div>
          </div>
        </ZenCard>

        <ZenCard className="bg-gradient-to-br from-white/80 to-slate-50/30 border-slate-100/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100/80 text-slate-700 rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Line Items</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-slate-900">
                  {items.length.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-400">Entries</p>
              </div>
            </div>
          </div>
        </ZenCard>
      </div>

      {/* Filter Bar */}
      <CostFilterBar locale={locale} />

      {/* Data Table Section */}
      <ZenCard className="p-0 overflow-hidden border-white/40 shadow-2xl bg-white/40 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/5 border-b border-slate-200/60">
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Order No</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Shipper</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Cost Item</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">Transport</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    No expense records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/60 transition-colors group">
                    <td className="px-6 py-4">
                      <Link 
                        href={`/${locale}/orders/${item.order_id}`}
                        className="text-sm font-bold text-rose-600 hover:text-rose-800 flex items-center gap-2"
                      >
                        {item.order?.order_no || 'ORD-UNKNOWN'}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{item.order?.shipper?.name || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-600">{item.cost_type}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ZenBadge variant="info" className="bg-slate-100 text-slate-700 border-slate-200 px-3 py-1">
                        {item.order?.trans_mode}
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
