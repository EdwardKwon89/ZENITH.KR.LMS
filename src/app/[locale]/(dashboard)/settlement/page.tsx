import { getSettlementOverview } from "@/app/actions/finance";
import { requireAuth } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";
import { InvoiceTable } from "@/components/admin/InvoiceTable";

export default async function SettlementPage({ params: { locale } }: { params: { locale: string } }) {
  const { profile } = await requireAuth();
  const invoices = await getSettlementOverview();
  
  const isAdmin = profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN || 
                  profile?.role === USER_ROLES.ADMIN;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1 px-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
          Finance & Settlement
        </h1>
        <p className="text-slate-500 font-medium">정산 현황 및 청구서 관리 {isAdmin && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase font-black tracking-tighter">Admin View</span>}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 통계 카드 (Glassmorphism) */}
        {[
          { label: 'Unpaid Invoices', value: invoices.filter(i => i.status !== 'PAID').length, color: 'from-amber-500 to-orange-600', icon: '💳' },
          { label: 'Total Outstanding', value: `$${invoices.filter(i => i.status !== 'PAID').reduce((acc, i) => acc + Number(i.total_amount), 0).toLocaleString()}`, color: 'from-blue-600 to-indigo-700', icon: '💰' },
          { label: 'Recently Paid', value: invoices.filter(i => i.status === 'PAID').length, color: 'from-emerald-500 to-teal-600', icon: '✅' },
        ].map((stat, idx) => (
          <div key={idx} className="zen-tactile bg-white border border-slate-200 rounded-3xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-bl-full`} />
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${stat.color} opacity-20`} />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <InvoiceTable invoices={invoices} isAdmin={isAdmin} />
    </div>
  );
}
