"use client";

import { Inventory } from "@/types/inventory";
import { ZenButton, ZenInput, ZenCard } from "@/components/ui/ZenUI";
import { useState } from "react";
import { adjustInventory } from "@/app/actions/inventory";
import { X, Save, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Inventory;
}

export default function InventoryAdjustmentModal({
  isOpen,
  onClose,
  inventory
}: InventoryAdjustmentModalProps) {
  const [qtyChange, setQtyChange] = useState<string>("0");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAdjust = async () => {
    const amount = parseInt(qtyChange);
    if (isNaN(amount) || amount === 0) {
      toast.error("Please enter a valid non-zero quantity.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for adjustment.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adjustInventory({
        inventoryId: inventory.id,
        adjustmentQty: amount,
        reason: reason.trim()
      });

      if (result.success) {
        toast.success("Inventory adjusted successfully.");
        onClose();
        setQtyChange("0");
        setReason("");
      } else {
        toast.error(result.error || "Failed to adjust inventory.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <ZenCard className="w-full max-w-md p-8 shadow-2xl relative overflow-hidden bg-white border-white/40">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Adjust Inventory</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manually update stock level for <span className="text-blue-600 font-bold">{inventory.item_name}</span>
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</span>
              <span className="text-xl font-black text-slate-900">{inventory.on_hand_qty.toLocaleString()}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-4" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available</span>
              <span className="text-xl font-black text-blue-600">{inventory.available_qty.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Quantity Change</label>
            <div className="relative group">
              <ZenInput
                type="number"
                value={qtyChange}
                onChange={(e) => setQtyChange(e.target.value)}
                placeholder="e.g. 50 or -20"
                className="pl-12 text-lg font-bold"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors">
                {parseInt(qtyChange) > 0 ? (
                  <TrendingUp className="text-emerald-500" size={20} />
                ) : parseInt(qtyChange) < 0 ? (
                  <TrendingDown className="text-rose-500" size={20} />
                ) : (
                  <AlertCircle className="text-slate-300" size={20} />
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic mt-1 px-1">
              * Positive number increases stock, negative decreases it.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Reason / Notes</label>
            <textarea
              className="w-full bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] focus:shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all text-sm font-medium min-h-[100px]"
              placeholder="Explain why this adjustment is being made..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <ZenButton 
              variant="ghost" 
              className="flex-1" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </ZenButton>
            <ZenButton 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              onClick={handleAdjust}
              loading={isSubmitting}
            >
              <Save size={18} className="mr-1" />
              Apply
            </ZenButton>
          </div>
        </div>
      </ZenCard>
    </div>
  );
}
