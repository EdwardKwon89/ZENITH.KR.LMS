"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { Plus, Edit2, Trash2, XCircle, Ship, Plane, Truck } from "lucide-react";
import { upsertTransportCost, deleteTransportCost } from "@/app/actions/finance";
import { motion, AnimatePresence } from "framer-motion";
import { ZenBadge } from "@/components/ui/ZenUI";

interface TransportCost {
  id: string;
  carrier_id: string;
  origin_port_id: string;
  destination_port_id: string;
  trans_mode: 'AIR' | 'SEA' | 'TRUCK';
  cost_type: string;
  unit_price: number;
  currency: string;
  effective_date: string;
  expiry_date: string;
  carrier?: { name: string };
  origin_port?: { name: string, code: string };
  destination_port?: { name: string, code: string };
}

export default function TransportCostClient({ 
  initialData, 
  ports, 
  carriers 
}: { 
  initialData: any[], 
  ports: any[], 
  carriers: any[] 
}) {
  const [data, setData] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<TransportCost | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const columns: ColumnDef<TransportCost>[] = [
    {
      accessorKey: "trans_mode",
      header: "모드",
      cell: ({ row }) => {
        const mode = row.original.trans_mode;
        const icon = mode === 'AIR' ? <Plane size={14}/> : mode === 'SEA' ? <Ship size={14}/> : <Truck size={14}/>;
        return (
          <div className="flex items-center gap-1.5 font-bold text-xs">
            {icon}
            <span>{mode}</span>
          </div>
        );
      }
    },
    {
      id: "route",
      header: "Route (Origin → Dest)",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.original.origin_port?.code}</span>
          <span className="text-slate-400">→</span>
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.original.destination_port?.code}</span>
        </div>
      )
    },
    {
      accessorKey: "carrier.name",
      header: "운송사",
      cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.carrier?.name || '-'}</span>
    },
    {
      accessorKey: "cost_type",
      header: "비용 항목",
      cell: ({ row }) => <ZenBadge variant="info">{row.original.cost_type}</ZenBadge>
    },
    {
      accessorKey: "unit_price",
      header: "단가",
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-brand-700">
          {Number(row.original.unit_price).toLocaleString()} <span className="text-[10px] text-slate-400">{row.original.currency}</span>
        </div>
      )
    },
    {
      id: "validity",
      header: "유효 기간",
      cell: ({ row }) => (
        <div className="text-xs text-slate-500 whitespace-nowrap">
          {row.original.effective_date} ~ {row.original.expiry_date}
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const handleEdit = (cost: TransportCost) => {
    setEditingCost(cost);
    setIsModalOpen(true);
  };

  const handleDelete = async (cost: TransportCost) => {
    if (!confirm(`해당 원가 정보를 삭제하시겠습니까?`)) return;
    try {
      await deleteTransportCost(cost.id);
      setData(prev => prev.filter(c => c.id !== cost.id));
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const costData = Object.fromEntries(formData.entries());
    
    if (editingCost) (costData as any).id = editingCost.id;

    try {
      const result = await upsertTransportCost(costData);
      // 단순화를 위해 전체 데이터 다시 불러오기 혹은 로컬 업데이트 (서버 액션 반환값 기반)
      window.location.reload(); 
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingCost(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm hover:shadow-brand-500/20"
        >
          <Plus size={18} />
          새 원가 등록
        </button>
      </div>

      <ZenDataGrid 
        columns={columns} 
        data={data} 
        title="운송 원가 목록"
        description="등록된 표준 운송 원가 및 요율 현황입니다."
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCost ? "원가 정보 수정" : "새 원가 등록"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">운송 모드</label>
                    <select
                      name="trans_mode"
                      defaultValue={editingCost?.trans_mode || "AIR"}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="AIR">AIR</option>
                      <option value="SEA">SEA</option>
                      <option value="TRUCK">TRUCK</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">운송사 (Carrier)</label>
                    <select
                      name="carrier_id"
                      defaultValue={editingCost?.carrier_id}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="">운송사 선택</option>
                      {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">출발항 (Origin)</label>
                    <select
                      name="origin_port_id"
                      defaultValue={editingCost?.origin_port_id}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="">항구 선택</option>
                      {ports.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">도착항 (Destination)</label>
                    <select
                      name="destination_port_id"
                      defaultValue={editingCost?.destination_port_id}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="">항구 선택</option>
                      {ports.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1 col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">비용 항목</label>
                    <input
                      name="cost_type"
                      defaultValue={editingCost?.cost_type}
                      placeholder="e.g. FREIGHT"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">단가</label>
                    <input
                      type="number"
                      step="0.01"
                      name="unit_price"
                      defaultValue={editingCost?.unit_price}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">통화</label>
                    <select
                      name="currency"
                      defaultValue={editingCost?.currency || "USD"}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="USD">USD</option>
                      <option value="KRW">KRW</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">유효 시작일</label>
                    <input
                      type="date"
                      name="effective_date"
                      defaultValue={editingCost?.effective_date}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">유효 종료일</label>
                    <input
                      type="date"
                      name="expiry_date"
                      defaultValue={editingCost?.expiry_date}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isLoading ? "처리 중..." : editingCost ? "수정 완료" : "원가 정보 등록"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
