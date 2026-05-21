"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { upsertCommonCode, deleteCommonCode } from "@/app/actions/master";
import { motion, AnimatePresence } from "framer-motion";

interface CommonCode {
  id: string;
  group_code: string;
  code_value: string;
  code_name_ko: string;
  code_name_en: string;
  sort_order: number;
  is_active: boolean;
  description?: string;
}

export default function CodesClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<CommonCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const columns: ColumnDef<CommonCode>[] = [
    {
      accessorKey: "group_code",
      header: "그룹 코드",
      cell: ({ row }) => <span className="font-mono text-xs font-bold text-brand-700">{row.original.group_code}</span>,
    },
    {
      accessorKey: "code_value",
      header: "코드 값",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.code_value}</span>,
    },
    {
      accessorKey: "code_name_ko",
      header: "코드명 (한글)",
    },
    {
      accessorKey: "code_name_en",
      header: "코드명 (영문)",
    },
    {
      accessorKey: "sort_order",
      header: "순서",
      cell: ({ row }) => <span className="text-slate-500">{row.original.sort_order}</span>,
    },
    {
      accessorKey: "is_active",
      header: "상태",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.is_active ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <XCircle size={16} className="text-slate-300" />
          )}
          <span className={row.original.is_active ? "text-emerald-700 font-medium" : "text-slate-400"}>
            {row.original.is_active ? "활성" : "비활성"}
          </span>
        </div>
      ),
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

  const handleEdit = (code: CommonCode) => {
    setEditingCode(code);
    setIsModalOpen(true);
  };

  const handleDelete = async (code: CommonCode) => {
    if (!confirm(`'${code.code_name_ko}' 코드를 삭제하시겠습니까?`)) return;

    try {
      await deleteCommonCode(code.group_code, code.code_value);
      setData(prev => prev.filter(c => c.id !== code.id));
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const codeData = Object.fromEntries(formData.entries());

    try {
      const result = await upsertCommonCode(codeData);

      if (editingCode) {
        setData(prev => prev.map(c =>
          (c.group_code === result.group_code && c.code_value === result.code_value) ? result : c
        ));
      } else {
        setData(prev => [result, ...prev]);
      }

      setIsModalOpen(false);
      setEditingCode(null);
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
            setEditingCode(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-sm hover:shadow-brand-500/20"
        >
          <Plus size={18} />
          새 코드 추가
        </button>
      </div>

      <ZenDataGrid
        columns={columns}
        data={data}
        title="공통 코드 목록"
        description="전체 공통 코드 현황입니다."
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
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCode ? "코드 수정" : "새 코드 등록"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">그룹 코드</label>
                    <input
                      name="group_code"
                      defaultValue={editingCode?.group_code}
                      placeholder="e.g. SHIP_STATUS"
                      required
                      readOnly={!!editingCode}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all read-only:opacity-60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">코드 값</label>
                    <input
                      name="code_value"
                      defaultValue={editingCode?.code_value}
                      placeholder="e.g. ARRIVED"
                      required
                      readOnly={!!editingCode}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all read-only:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">코드명 (한글)</label>
                  <input
                    name="code_name_ko"
                    defaultValue={editingCode?.code_name_ko}
                    placeholder="한국어 설명"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">코드명 (영문)</label>
                  <input
                    name="code_name_en"
                    defaultValue={editingCode?.code_name_en}
                    placeholder="English description"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">정렬 순서</label>
                    <input
                      type="number"
                      name="sort_order"
                      defaultValue={editingCode?.sort_order || 0}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">활성 상태</label>
                    <select
                      name="is_active"
                      defaultValue={editingCode?.is_active?.toString() || "true"}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                    >
                      <option value="true">활성</option>
                      <option value="false">비활성</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isLoading ? "처리 중..." : editingCode ? "수정 완료" : "코드 등록"}
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
