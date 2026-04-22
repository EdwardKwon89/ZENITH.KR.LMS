'use client';

import { OrderListItem } from '@/types/orders';
import { useState, useMemo } from 'react';
import { ZenButton } from '../ui/ZenUI';
import { Check, CheckCircle2, Package, Search } from 'lucide-react';
import { createMasterOrder } from '@/app/actions/orders';
import { toast } from 'sonner';

interface HouseOrderSelectionTableProps {
  orders: OrderListItem[];
  ports: any[];
}

export default function HouseOrderSelectionTable({ orders, ports }: HouseOrderSelectionTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [originFilter, setOriginFilter] = useState<string>('');
  const [destFilter, setDestFilter] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 선택된 오더들의 정보
  const selectedOrders = useMemo(() => 
    orders.filter(o => selectedIds.includes(o.id)),
    [orders, selectedIds]
  );

  // 포구 필터링 로직: 실무자가 선택한 포구에 맞는 오더들만 필터링
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchOrigin = !originFilter || o.origin_port_id === originFilter;
      const matchDest = !destFilter || o.dest_port_id === destFilter;
      return matchOrigin && matchDest;
    });
  }, [orders, originFilter, destFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateMaster = async () => {
    if (selectedIds.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await createMasterOrder({
        houseOrderIds: selectedIds,
        origin_port_id: originFilter || undefined,
        dest_port_id: destFilter || undefined
      });
      toast.success('마스터 오더가 성공적으로 생성되었습니다.');
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalWeight = selectedOrders.reduce((sum, o) => sum + (Number(o.status === 'MASTERED' ? 0 : 0)), 0); // TODO: Aggregation logic if needed on client

  return (
    <div className="space-y-6">
      {/* Smart Filter Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 p-6 rounded-3xl text-white shadow-2xl border border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse"></div>
        
        <div className="space-y-2 relative z-10">
          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-1 bg-blue-400 rounded-full animate-ping"></span>
            Origin Port Filter
          </label>
          <select 
            value={originFilter}
            onChange={(e) => {
              setOriginFilter(e.target.value);
              setSelectedIds([]); // 포구 변경 시 선택 초기화 (CEO 원칙: 같은 포구끼리만)
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 ring-blue-500 outline-none transition-all hover:bg-white/10"
          >
            <option value="" className="bg-slate-900 uppercase">Select Origin Port</option>
            {ports.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name} ({p.code})</option>)}
          </select>
        </div>

        <div className="space-y-2 relative z-10">
          <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
             <span className="w-1 h-1 bg-purple-400 rounded-full animate-ping"></span>
             Destination Port Filter
          </label>
          <select 
             value={destFilter}
             onChange={(e) => {
               setDestFilter(e.target.value);
               setSelectedIds([]);
             }}
             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 ring-purple-500 outline-none transition-all hover:bg-white/10"
          >
            <option value="" className="bg-slate-900 uppercase">Select Destination Port</option>
            {ports.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name} ({p.code})</option>)}
          </select>
        </div>

        <div className="flex flex-col justify-end relative z-10">
          <ZenButton 
            onClick={handleCreateMaster}
            disabled={selectedIds.length === 0 || isSubmitting}
            className={`w-full py-2.5 rounded-xl font-black text-xs tracking-tighter transition-all shadow-lg flex items-center justify-center gap-2 ${
              selectedIds.length > 0 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-95 shadow-blue-500/30' 
                : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={16} /> 
            CREATE MASTER ({selectedIds.length})
          </ZenButton>
        </div>
      </div>

      {/* House Order List */}
      <div className="bg-white zen-tactile border border-slate-200 rounded-3xl overflow-hidden min-h-[400px] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 w-12">
                   <div className="w-5 h-5 border-2 border-slate-200 rounded-md"></div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipper</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center overflow-hidden">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Package size={64} className="text-slate-400" />
                      <p className="text-sm font-bold text-slate-500">대기 중인 하우스 오더가 없습니다.<br/><span className="text-[10px] font-medium tracking-normal text-slate-400">포구 필터를 조정해 보세요.</span></p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr 
                    key={order.id} 
                    onClick={() => toggleSelect(order.id)}
                    className={`group cursor-pointer transition-all ${selectedIds.includes(order.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="px-6 py-4">
                      <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                        selectedIds.includes(order.id) 
                          ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-500/20' 
                          : 'border-slate-200 group-hover:border-blue-400'
                      }`}>
                        {selectedIds.includes(order.id) && <Check size={14} className="text-white font-black" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{order.order_no}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{(order as any).order_type || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         <span className="text-[11px] font-black text-slate-900">{order.origin_port?.code}</span>
                         <span className="w-3 h-[1px] bg-slate-300"></span>
                         <span className="text-[11px] font-black text-slate-900">{order.dest_port?.code}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-slate-700">{order.shipper?.name}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
