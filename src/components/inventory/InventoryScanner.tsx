"use client";

import { useState } from "react";
import { ZenCard, ZenButton, ZenInput } from "@/components/ui/ZenUI";
import { Scan, PackageCheck, Truck, RefreshCw } from "lucide-react";
import { updateOrderStatus } from "@/app/actions/orders";
import { toast } from "sonner";
import { OrderStatus } from "@/types/orders";
import { createClient } from "@/utils/supabase/client";

export default function InventoryScanner() {
  const [barcode, setBarcode] = useState("");
  const [isProcessing, setIsBusy] = useState(false);
  const [mode, setMode] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    setIsBusy(true);
    try {
      const supabase = createClient();
      let targetId = barcode;

      // 1. If barcode is an Order Number (Z-...), resolve to UUID
      if (barcode.startsWith('Z-')) {
        const { data, error } = await supabase
          .from('zen_orders')
          .select('id')
          .eq('order_no', barcode)
          .single();
        
        if (error || !data) throw new Error(`Order ${barcode} not found.`);
        targetId = data.id;
      }

      // 2. Update Status
      const nextStatus = mode === 'INBOUND' ? OrderStatus.WAREHOUSED : OrderStatus.RELEASED;
      const result = await updateOrderStatus(targetId, nextStatus, `Barcode Scanned: ${mode} (${barcode})`);
      
      if (result) {
        toast.success(`Successfully processed ${barcode} (${mode})`);
        setBarcode("");
      }
    } catch (err: any) {
      toast.error(`Scan failed: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <ZenCard className="p-6 bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Scan size={120} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-500 rounded-lg text-white">
              <Scan size={18} />
            </div>
            <h2 className="text-xl font-black tracking-tight uppercase">Intelligent Scanner</h2>
          </div>
          <p className="text-slate-400 text-xs font-medium">Scan GS1-128 or Manual Entry for Inbound/Outbound</p>
        </div>

        <form onSubmit={handleScan} className="flex-1 w-full flex flex-col sm:flex-row gap-3">
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
            <button
              type="button"
              onClick={() => setMode('INBOUND')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'INBOUND' ? "bg-brand-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              <PackageCheck size={14} />
              INBOUND
            </button>
            <button
              type="button"
              onClick={() => setMode('OUTBOUND')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'OUTBOUND' ? "bg-brand-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}
            >
              <Truck size={14} />
              OUTBOUND
            </button>
          </div>

          <div className="flex-1 relative">
            <ZenInput
              placeholder="Waiting for scan..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-brand-500 rounded-2xl h-full py-3"
              disabled={isProcessing}
              autoFocus
            />
            {isProcessing && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <RefreshCw size={18} className="text-brand-400 animate-spin" />
              </div>
            )}
          </div>

          <ZenButton 
            type="submit"
            disabled={isProcessing || !barcode}
            className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black tracking-tighter"
          >
            PROCESS
          </ZenButton>
        </form>
      </div>
    </ZenCard>
  );
}
