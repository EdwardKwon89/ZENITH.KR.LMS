"use client";

import { Inventory } from "@/types/inventory";
import { ZenCard, ZenBadge, ZenButton } from "@/components/ui/ZenUI";
import { 
  History, 
  Settings, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import InventoryAdjustmentModal from "./InventoryAdjustmentModal";
import InventoryHistorySheet from "./InventoryHistorySheet";

import { USER_ROLES } from "@/lib/auth/rbac";

interface InventoryDataTableProps {
  items: Inventory[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  locale: string;
  userRole?: string;
}

export default function InventoryDataTable({
  items,
  totalCount,
  currentPage,
  pageSize,
  locale,
  userRole
}: InventoryDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenAdjustment = (inventory: Inventory) => {
    setSelectedInventory(inventory);
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenHistory = (inventory: Inventory) => {
    setSelectedInventory(inventory);
    setIsHistorySheetOpen(true);
  };

  return (
    <ZenCard className="overflow-hidden border-slate-200/60 shadow-xl bg-white/40 backdrop-blur-xl p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Product / SKU</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">On Hand</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Reserved</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Available</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No inventory data found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.item_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 tracking-tighter">
                        {item.sku_code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-700">{item.on_hand_qty.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-500">{item.reserved_qty.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${item.available_qty <= item.min_stock_level ? 'text-rose-600' : 'text-blue-600'}`}>
                        {item.available_qty.toLocaleString()}
                      </span>
                      {item.available_qty <= item.min_stock_level && (
                        <AlertCircle size={14} className="text-rose-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.available_qty <= 0 ? (
                      <ZenBadge variant="danger">Out of Stock</ZenBadge>
                    ) : item.available_qty <= item.min_stock_level ? (
                      <ZenBadge variant="warning">Low Stock</ZenBadge>
                    ) : (
                      <ZenBadge variant="success">Healthy</ZenBadge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                         onClick={() => handleOpenHistory(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="View History"
                      >
                        <History size={16} />
                      </button>
                      
                      {(userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.ZENITH_SUPER_ADMIN) && (
                        <button 
                          onClick={() => handleOpenAdjustment(item)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Adjust Inventory"
                        >
                          <Settings size={16} />
                        </button>
                      )}

                      
                      <button className="p-2 text-slate-300 hover:text-slate-600 transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to{" "}
          <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
          <span className="text-slate-900 font-bold">{totalCount}</span> items
        </p>
        <div className="flex items-center gap-2">
          <ZenButton
            variant="ghost"
            className="p-2 min-w-0 h-auto"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </ZenButton>
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === i + 1
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <ZenButton
            variant="ghost"
            className="p-2 min-w-0 h-auto"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </ZenButton>
        </div>
      </div>

      {/* Modals */}
      {selectedInventory && (
        <>
          <InventoryAdjustmentModal
            isOpen={isAdjustmentModalOpen}
            onClose={() => setIsAdjustmentModalOpen(false)}
            inventory={selectedInventory}
          />
          <InventoryHistorySheet
            isOpen={isHistorySheetOpen}
            onClose={() => setIsHistorySheetOpen(false)}
            inventory={selectedInventory}
          />
        </>
      )}
    </ZenCard>
  );
}
