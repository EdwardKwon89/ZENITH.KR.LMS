import { getInventoryList } from "@/app/actions/inventory";
import { requireAuth } from "@/lib/auth/guards";
import InventoryFilterBar from "@/components/inventory/InventoryFilterBar";
import InventoryDataTable from "@/components/inventory/InventoryDataTable";
import { Package, Truck, AlertCircle } from "lucide-react";
import { ZenCard } from "@/components/ui/ZenUI";

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Package className="text-white" size={24} />
            </div>
            INVENTORY CONTROL
          </h1>
          <p className="text-slate-500 font-medium ml-14 mt-1 text-sm">
            Monitor real-time stock levels and warehouse distribution
          </p>
        </div>

        <div className="flex gap-4">
          <ZenCard className="p-4 flex items-center gap-4 border-slate-100 min-w-[180px]">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SKU</p>
              <p className="text-lg font-black text-slate-900">{totalCount}</p>
            </div>
          </ZenCard>
          
          <ZenCard className="p-4 flex items-center gap-4 border-slate-100 min-w-[180px]">
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
