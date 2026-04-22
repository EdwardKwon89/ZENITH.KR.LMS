'use client';

import { MasterOrderListItem } from '@/types/orders';
import { ZenButton } from '../ui/ZenUI';
import { Barcode, FileText, Trash2, Globe, Ship, Hash } from 'lucide-react';
import { dissolveMasterOrder } from '@/app/actions/orders';
import { toast } from 'sonner';
import { useState } from 'react';

interface MasterOrderTableProps {
  masters: MasterOrderListItem[];
  locale: string;
}

export default function MasterOrderTable({ masters, locale }: MasterOrderTableProps) {
  const [isBusy, setIsBusy] = useState<string | null>(null);

  const handleDissolve = async (id: string, masterNo: string) => {
    if (!confirm(`[경고] 마스터 오더 ${masterNo}를 해체하시겠습니까?\n모든 하우스 오더가 개별 수정 가능 상태로 복구됩니다.`)) return;
    
    setIsBusy(id);
    try {
      await dissolveMasterOrder(id);
      toast.success(`${masterNo} 해체 완료`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsBusy(null);
    }
  };

  return (
    <div className="bg-white zen-tactile border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Info</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Port / Route</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aggregation</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right"> 실무 Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {masters.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <Hash size={48} className="text-slate-300" />
                    <p className="text-sm font-bold text-slate-500 italic">생성된 마스터 오더가 없습니다.</p>
                  </div>
                </td>
              </tr>
            ) : (
              masters.map(master => (
                <tr key={master.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 rounded-lg transition-all">
                      <div className="flex items-center gap-2">
                        {master.carrier?.iata_code ? (
                          <div className="flex items-center justify-center min-w-[24px] h-5 px-1 rounded-md bg-brand-600 text-[10px] font-black text-white shadow-sm ring-1 ring-brand-700/50 uppercase tracking-tighter">
                            {master.carrier.iata_code}
                          </div>
                        ) : (
                          <div className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-400">
                            <Hash size={12} />
                          </div>
                        )}
                        <span className="text-[15px] font-black text-slate-900 group-hover:text-brand-600 transition-colors uppercase tracking-tight">
                          {master.master_no}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-white bg-slate-950 px-2 py-0.5 rounded-[4px] uppercase tracking-widest shadow-sm">
                          {master.transport_mode || 'AIR'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
                          {master.created_at ? new Date(master.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end min-w-[50px]">
                        <span className="text-[11px] font-black text-slate-900 underline decoration-blue-500 decoration-2 underline-offset-4">{master.origin_port?.code || 'N/A'}</span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{master.origin_port?.name}</span>
                      </div>
                      <Globe size={12} className="text-slate-300 animate-spin-slow" />
                      <div className="flex flex-col items-start min-w-[50px]">
                        <span className="text-[11px] font-black text-slate-900 underline decoration-indigo-500 decoration-2 underline-offset-4">{master.dest_port?.code || 'N/A'}</span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{master.dest_port?.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-1.5">
                      <div className="flex flex-col items-center bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 shadow-inner">
                        <span className="text-[10px] font-black text-blue-600">{master.total_house_count}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">House</span>
                      </div>
                      <div className="flex flex-col items-center bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 shadow-inner">
                        <span className="text-[10px] font-black text-slate-900">{(master.total_gross_weight || 0).toLocaleString()} <small className="text-[8px] text-slate-400">kg</small></span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Weight</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white shadow-sm shadow-blue-500/20 uppercase tracking-tighter">
                      {master.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ZenButton title="Manifest Print" className="w-8 h-8 p-0 rounded-lg hover:bg-blue-50 text-blue-600 border border-slate-200 transition-all hover:scale-110">
                        <FileText size={14} />
                      </ZenButton>
                      <ZenButton title="Barcode Print" className="w-8 h-8 p-0 rounded-lg hover:bg-slate-900 hover:text-white text-slate-600 border border-slate-200 transition-all hover:scale-110">
                        <Barcode size={14} />
                      </ZenButton>
                      <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                      <ZenButton 
                        disabled={isBusy === master.id}
                        onClick={() => handleDissolve(master.id, master.master_no)}
                        title="Dissolve Master" 
                        className="w-8 h-8 p-0 rounded-lg hover:bg-red-50 text-red-500 border border-slate-200 transition-all hover:scale-110"
                      >
                        <Trash2 size={14} className={isBusy === master.id ? 'animate-spin' : ''} />
                      </ZenButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
