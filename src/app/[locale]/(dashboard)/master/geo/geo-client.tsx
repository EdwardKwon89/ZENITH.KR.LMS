"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { Globe, Anchor, CheckCircle2, XCircle, Edit2, Plus, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { upsertPort } from "@/app/actions/master";

interface Nation {
  nation_code: string;
  name_ko: string;
  name_en: string;
  is_active: boolean;
}

interface Port {
  code: string;
  name: string;
  port_type: string;
  is_active?: boolean;
  nations?: { name_ko: string; name_en: string };
}

export default function GeoClient({ 
  initialNations, 
  initialPorts 
}: { 
  initialNations: any[], 
  initialPorts: any[] 
}) {
  const [activeTab, setActiveTab] = useState<"nations" | "ports">("nations");
  const [ports, setPorts] = useState(initialPorts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 국가 컬럼 정의 (조회 전용)
  const nationColumns: ColumnDef<Nation>[] = [
    {
      accessorKey: "nation_code",
      header: "국가 코드",
      cell: ({ row }) => <span className="font-mono font-bold text-brand-700">{row.original.nation_code}</span>,
    },
    { accessorKey: "name_ko", header: "국가명 (한글)" },
    { accessorKey: "name_en", header: "국가명 (영문)" },
    {
      accessorKey: "is_active",
      header: "상태",
      cell: ({ row }) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-bold",
          row.original.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
        )}>
          {row.original.is_active ? "ACTIVE" : "INACTIVE"}
        </span>
      ),
    },
  ];

  // 항구 컬럼 정의 (편집 가능)
  const portColumns: ColumnDef<Port>[] = [
    {
      accessorKey: "code",
      header: "거점 코드 (IATA)",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-brand-700 tracking-wider">
            {row.original.code}
          </span>
          {row.original.port_type === "AIR" && (
            <span className="text-[9px] text-brand-400 font-medium">IATA 3-LETTER</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "port_type",
      header: "유형",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 overflow-hidden">
          {row.original.port_type === "SEA" ? (
            <Anchor size={14} className="text-blue-500" />
          ) : (
            <Plane size={14} className="text-violet-500" />
          )}
          <span className="text-xs font-semibold">{row.original.port_type === "SEA" ? "항만" : "공항"}</span>
        </div>
      ),
    },
    { accessorKey: "name", header: "거점명" },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <button
          onClick={() => {
            setEditingPort(row.original);
            setIsModalOpen(true);
          }}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"
        >
          <Edit2 size={16} />
        </button>
      ),
    },
  ];

  const handleSubmitPort = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const portData = Object.fromEntries(formData.entries());

    try {
      const result = await upsertPort(portData);
      setPorts(prev => prev.map(p => p.code === result.code ? { ...result, nations: editingPort?.nations } : p));
      setIsModalOpen(false);
      setEditingPort(null);
    } catch (error) {
      alert("거점 정보 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit mb-8 backdrop-blur-sm border border-slate-200/50">
        <button
          onClick={() => setActiveTab("nations")}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300",
            activeTab === "nations" ? "bg-white text-brand-600 shadow-md ring-1 ring-black/5 scale-[1.02]" : "text-slate-500 hover:text-brand-500"
          )}
        >
          NATIONS
        </button>
        <button
          onClick={() => setActiveTab("ports")}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300",
            activeTab === "ports" ? "bg-white text-brand-600 shadow-md ring-1 ring-black/5 scale-[1.02]" : "text-slate-500 hover:text-brand-500"
          )}
        >
          PORTS / AIRPORTS
        </button>
      </div>

      <div className="min-h-[600px]">
        {activeTab === "nations" ? (
          <ZenDataGrid 
            columns={nationColumns} 
            data={initialNations} 
            title="국가 마스터 리스트"
            description="플랫폼에서 지원하는 정식 국가 코드입니다."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingPort(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm overflow-hidden"
              >
                <Plus size={18} />
                새 거점 추가
              </button>
            </div>
            <ZenDataGrid 
              columns={portColumns} 
              data={ports} 
              title="글로벌 포트 정보"
              description="해상 항만 및 항공 공항 거점 리스트입니다."
            />
          </div>
        )}
      </div>

      {/* Port Edit Modal */}
      <AnimatePresence>
        {isModalOpen && activeTab === "ports" && (
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
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingPort ? "거점 정보 수정" : "새 거점 등록"}
                </h3>
              </div>

              <form onSubmit={handleSubmitPort} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                      거점 코드 {editingPort?.port_type === "AIR" ? "(IATA 3글자)" : "(5글자)"}
                    </label>
                    <input
                      name="code"
                      defaultValue={editingPort?.code}
                      placeholder={editingPort?.port_type === "AIR" ? "e.g. ICN" : "e.g. KRPUS"}
                      required
                      readOnly={!!editingPort}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all read-only:opacity-60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">국가 코드</label>
                    <input
                      name="country_code"
                      placeholder="e.g. KR"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">거점명</label>
                  <input
                    name="name"
                    defaultValue={editingPort?.name}
                    placeholder="부산항"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">거점 유형</label>
                    <select
                      name="port_type"
                      defaultValue={editingPort?.port_type || "SEA"}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10"
                    >
                      <option value="SEA">해상 항만 (Seaport)</option>
                      <option value="AIR">항공 공항 (Airport)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">활성 상태</label>
                    <select
                      name="is_active"
                      defaultValue={editingPort?.is_active?.toString() || "true"}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10"
                    >
                      <option value="true">활성</option>
                      <option value="false">비활성</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-bold"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isLoading ? "처리 중..." : (editingPort ? "거점 수정" : "거점 등록")}
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
