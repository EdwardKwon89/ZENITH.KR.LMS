"use client";

import { Inventory, InventoryHistory } from "@/types/inventory";
import { ZenCard, ZenBadge, ZenButton } from "@/components/ui/ZenUI";
import { useState, useEffect } from "react";
import { getInventoryHistory } from "@/app/actions/inventory";
import { X, ArrowUpRight, ArrowDownRight, Clock, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface InventoryHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory;
}

export default function InventoryHistorySheet({
  isOpen,
  onClose,
  inventory
}: InventoryHistorySheetProps) {
  const [history, setHistory] = useState<InventoryHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && inventory.id) {
      loadHistory();
    }
  }, [isOpen, inventory.id]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await getInventoryHistory(inventory.id);
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl relative flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Transaction History</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-blue-600 font-bold">{inventory.item_name}</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase px-1.5 py-0.5 bg-white rounded-md border border-slate-200">
                {inventory.sku_code}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading History...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Clock size={40} className="opacity-20" />
              <p className="font-bold tracking-tight">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((record, index) => (
                <div key={record.id} className="relative pl-8 pb-6 group">
                  {/* Timeline connector */}
                  {index !== history.length - 1 && (
                    <div className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-slate-100 group-hover:bg-blue-100 transition-colors" />
                  )}
                  
                  {/* Icon indicator */}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm border ${
                    record.change_qty > 0 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                      : record.change_qty < 0 
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {record.change_qty > 0 ? (
                      <ArrowUpRight size={12} strokeWidth={3} />
                    ) : record.change_qty < 0 ? (
                      <ArrowDownRight size={12} strokeWidth={3} />
                    ) : (
                      <Clock size={12} strokeWidth={3} />
                    )}
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm group-hover:border-blue-100 group-hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col">
                        <span className={`text-lg font-black ${
                          record.change_qty > 0 ? 'text-emerald-600' : record.change_qty < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}>
                          {record.change_qty > 0 ? '+' : ''}{record.change_qty.toLocaleString()}
                        </span>
                        <ZenBadge variant="info" className="mt-1 w-fit px-2 text-[10px] font-black tracking-widest uppercase py-0.5">
                          {record.transaction_type.replace('_', ' ')}
                        </ZenBadge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <FileText size={14} className="opacity-50" />
                        <p className="text-sm font-medium leading-relaxed italic">
                          "{record.remarks || 'No description provided'}"
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 w-fit px-2 py-1 rounded-lg">
                        <User size={10} />
                        <span>Action by: System Admin</span>
                      </div>
                    </div>

                    {record.reference_id && (
                      <div className="mt-4 pt-4 border-t border-slate-50">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Reference ID</span>
                        <p className="text-[10px] font-mono text-blue-500 mt-0.5 truncate">{record.reference_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
          <ZenButton 
            variant="tactile" 
            className="w-full justify-center" 
            onClick={onClose}
          >
            Close History
          </ZenButton>
        </div>
      </div>
    </div>
  );
}
