import { getSettlementOverview } from "@/app/actions/finance";
import { requireAuth } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";
import { InvoiceTable } from "@/components/admin/InvoiceTable";

import { Wallet } from "lucide-react";

export default async function SettlementPage({ params }: { params: Promise<{ locale: string }> }) {
  await params; // Next.js 16: params is a Promise
  const { profile } = await requireAuth();
  const invoices = await getSettlementOverview();
  
  const isAdmin = profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN || 
                  profile?.role === USER_ROLES.ADMIN;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 px-2">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settlement Control</h1>
          <p className="text-slate-500 font-medium text-xs">
            Manage your financial transactions and payouts 
            {isAdmin && <span className="ml-2 text-[10px] bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full uppercase font-black tracking-tighter">Admin View</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 통계 카드 (Glassmorphism) */}
        {[
          { 
            label: 'Unpaid Invoices', 
            value: invoices.recentInvoices.filter((i: any) => i.status !== 'PAID').length, 
            color: 'from-amber-500 to-orange-600', 
            icon: '💳' 
          },
          { 
            label: 'Total Outstanding', 
            value: `${invoices.currency} ${invoices.totalUnpaid.toLocaleString()}`, 
            color: 'from-blue-600 to-indigo-700', 
            icon: '💰' 
          },
          { 
            label: 'Recently Paid', 
            value: invoices.recentInvoices.filter((i: any) => i.status === 'PAID').length, 
            color: 'from-emerald-500 to-teal-600', 
            icon: '✅' 
          },
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

      <InvoiceTable invoices={invoices.recentInvoices} isAdmin={isAdmin} />
    </div>
  );
}
