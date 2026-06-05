"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { Plus, Edit2, Trash2, XCircle, Anchor, Calendar } from "lucide-react";
import { upsertVesselSchedule, deleteVesselSchedule } from "@/app/actions/schedules";
import { motion, AnimatePresence } from "framer-motion";
import { ZenBadge } from "@/components/ui/ZenUI";
import { format } from "date-fns";

interface VesselSchedule {
  id: string;
  vessel_name: string;
  voyage_no: string;
  origin_port_id: string;
  destination_port_id: string;
  service_type: string;
  carrier_id?: string;
  etd: string;
  eta: string;
  status: string;
  origin_port?: { name: string, code: string };
  destination_port?: { name: string, code: string };
}

export default function ScheduleClient({ 
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
  const [editingSchedule, setEditingSchedule] = useState<VesselSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const columns: ColumnDef<VesselSchedule>[] = [
    {
      accessorKey: "vessel_name",
      header: "선박/편명",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
            <Anchor size={14} />
          </div>
          <div>
            <div className="font-bold text-slate-900">{row.original.vessel_name}</div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">{row.original.voyage_no}</div>
          </div>
        </div>
      )
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ZenBadge variant="default" className="font-mono">{row.original.origin_port?.code}</ZenBadge>
          <span className="text-slate-300">→</span>
          <ZenBadge variant="default" className="font-mono">{row.original.destination_port?.code}</ZenBadge>
        </div>
      )
    },
    {
      accessorKey: "etd",
      header: "ETD",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar size={12} className="text-brand-500" />
          <span className="font-medium">{format(new Date(row.original.etd), 'yyyy-MM-dd HH:mm')}</span>
        </div>
      )
    },
    {
      accessorKey: "eta",
      header: "ETA",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar size={12} className="text-emerald-500" />
          <span className="font-medium">{format(new Date(row.original.eta), 'yyyy-MM-dd HH:mm')}</span>
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: any = {
          'SCHEDULED': 'info',
          'SAILING': 'default',
          'ARRIVED': 'success',
          'DELAYED': 'warning'
        };
        return <ZenBadge variant={variants[status] || 'default'}>{status}</ZenBadge>;
      }
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

  const handleEdit = (schedule: VesselSchedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDelete = async (schedule: VesselSchedule) => {
    if (!confirm(`스케줄을 삭제하시겠습니까?`)) return;
    try {
      await deleteVesselSchedule(schedule.id);
      setData(prev => prev.filter(s => s.id !== schedule.id));
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const scheduleData = Object.fromEntries(
      Array.from(formData.entries()).filter(([_, v]) => v !== "")
    );
    
    if (editingSchedule) (scheduleData as any).id = editingSchedule.id;

    try {
      await upsertVesselSchedule(scheduleData);
      window.location.reload(); 
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingSchedule(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm hover:shadow-brand-500/20"
        >
          <Plus size={18} />
          새 스케줄 등록
        </button>
      </div>

      <ZenDataGrid 
        columns={columns} 
        data={data} 
        title="운항 스케줄 목록"
        description="전체 선박 및 항공기 운항 일정을 관리합니다."
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
                  {editingSchedule ? "스케줄 정보 수정" : "새 스케줄 등록"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">운송 모드</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer has-[:checked]:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:text-brand-700 transition-all">
                        <input type="radio" name="service_type" value="AIR" defaultChecked className="accent-brand-600" />
                        <span className="text-sm font-bold">AIR</span>
                      </label>
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer has-[:checked]:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:text-brand-700 transition-all">
                        <input type="radio" name="service_type" value="SEA" defaultChecked={editingSchedule?.service_type === 'SEA'} className="accent-brand-600" />
                        <span className="text-sm font-bold">SEA</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">운송사 (Carrier)</label>
                    <select
                      name="carrier_id"
                      defaultValue={editingSchedule?.carrier_id || ""}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="">운송사 선택</option>
                      {carriers.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">선박/항공기 명칭</label>
                    <input
                      name="vessel_name"
                      defaultValue={editingSchedule?.vessel_name}
                      placeholder="e.g. HYUNDAI TOKYO"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">항차/편명 (Voyage No)</label>
                    <input
                      name="voyage_no"
                      defaultValue={editingSchedule?.voyage_no}
                      placeholder="e.g. V.001E"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">출발항 (POL)</label>
                    <select
                      name="origin_port_id"
                      defaultValue={editingSchedule?.origin_port_id}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="">출발항 선택</option>
                      {ports.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">도착항 (POD)</label>
                    <select
                      name="destination_port_id"
                      defaultValue={editingSchedule?.destination_port_id}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="">도착항 선택</option>
                      {ports.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">ETD (예정 출항일)</label>
                    <input
                      type="datetime-local"
                      name="etd"
                      defaultValue={editingSchedule?.etd ? new Date(editingSchedule.etd).toISOString().slice(0, 16) : ""}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">ETA (예정 입항일)</label>
                    <input
                      type="datetime-local"
                      name="eta"
                      defaultValue={editingSchedule?.eta ? new Date(editingSchedule.eta).toISOString().slice(0, 16) : ""}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">운항 상태</label>
                  <select
                    name="status"
                    defaultValue={editingSchedule?.status || "SCHEDULED"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                  >
                    <option value="SCHEDULED">SCHEDULED (예정)</option>
                    <option value="SAILING">SAILING (운항중)</option>
                    <option value="ARRIVED">ARRIVED (입항완료)</option>
                    <option value="DELAYED">DELAYED (지연)</option>
                  </select>
                </div>

                <div className="space-y-1 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isLoading ? "처리 중..." : editingSchedule ? "수정 완료" : "스케줄 등록"}
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
