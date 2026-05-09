import { getInventoryList } from "@/app/actions/inventory";
import { requireAuth } from "@/lib/auth/guards";
import InventoryFilterBar from "@/components/inventory/InventoryFilterBar";
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import InventoryScanner from "@/components/inventory/InventoryScanner";
import { Package, Truck, AlertCircle, Box } from "lucide-react";
import { ZenCard } from "@/components/ui/ZenUI";
import { USER_ROLES } from "@/lib/auth/rbac";

export default async function InventoryPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const resolvedSearch = await searchParams;
  const { profile } = await requireAuth();

  const page = typeof resolvedSearch.page === "string" ? parseInt(resolvedSearch.page) : 1;
  const search = typeof resolvedSearch.search === "string" ? resolvedSearch.search : undefined;
  const lowStockOnly = resolvedSearch.lowStock === "true";

  const { items, totalCount } = await getInventoryList({
    page,
    pageSize: 10,
    search,
    lowStockOnly
  });

  const pageSize = 10;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
            <Box size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 tracking-tight">Inventory Control</h1>
            <p className="text-slate-500 font-medium text-xs">Real-time asset tracking & stock management</p>
          </div>
        </div>

        <div className="flex gap-4">
          <ZenCard className="p-4 flex items-center gap-4 border-white/20 min-w-[180px] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SKU</p>
              <p className="text-lg font-black text-slate-900">{totalCount}</p>
            </div>
          </ZenCard>
          
          <ZenCard className="p-4 flex items-center gap-4 border-white/20 min-w-[180px] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock</p>
              <p className="text-lg font-black text-slate-900">
                {items.filter(i => i.available_qty <= i.min_stock_level).length}
              </p>
            </div>
          </ZenCard>
        </div>
      </div>

      {/* [NEW] Intelligent Barcode Scanner */}
      {(profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN || profile?.role === USER_ROLES.MANAGER) && (
        <InventoryScanner />
      )}

      {/* Filter Bar */}
      <InventoryFilterBar locale={locale} />

      {/* Data Grid */}
      <InventoryDataTable
        items={items}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        locale={locale}
        userRole={profile?.role}
      />
    </div>
  );
}
