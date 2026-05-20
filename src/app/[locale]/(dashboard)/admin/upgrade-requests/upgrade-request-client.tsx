"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  MessageSquare,
  TrendingUp
} from "lucide-react";
import { reviewGradePromotion, GradePromotionRequest } from "@/app/actions/member";
import { motion, AnimatePresence } from "framer-motion";
import { ZenBadge, ZenButton } from "@/components/ui/ZenUI";
import { format } from "date-fns";
import { toast } from "sonner";

export default function UpgradeRequestClient({ 
  initialData 
}: { 
  initialData: GradePromotionRequest[] 
}) {
  const [allData, setAllData] = useState(initialData);
  const [selectedRequest, setSelectedRequest] = useState<GradePromotionRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const filteredData = allData.filter(item => {
    if (activeTab === 'ALL') return true;
    return item.status === activeTab;
  });

  const columns: ColumnDef<GradePromotionRequest>[] = [
    {
      accessorKey: "user_name",
      header: "신청자",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
            <User size={14} />
          </div>
          <div>
            <div className="font-bold text-slate-900">{row.original.user_name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{row.original.user_email}</div>
          </div>
        </div>
      )
    },
    {
      id: "promotion",
      header: "승급 단계",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ZenBadge variant="default" className="bg-slate-100 text-slate-600 border-none">
            {row.original.current_grade}
          </ZenBadge>
          <TrendingUp size={14} className="text-slate-300" />
          <ZenBadge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-100">
            {row.original.target_grade}
          </ZenBadge>
        </div>
      )
    },
    {
      accessorKey: "created_at",
      header: "신청일",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={12} />
          <span>{format(new Date(row.original.created_at), 'yyyy-MM-dd HH:mm')}</span>
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "PENDING") return <ZenBadge variant="warning">심사대기</ZenBadge>;
        if (status === "APPROVED") return <ZenBadge variant="success">승인됨</ZenBadge>;
        return <ZenBadge variant="danger">반려됨</ZenBadge>;
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isPending = row.original.status === 'PENDING';
        return (
          <button
            onClick={() => isPending && handleReview(row.original)}
            disabled={!isPending}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold border ${
              isPending 
                ? "bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-700 border-slate-200 hover:border-brand-200"
                : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
            }`}
          >
            <Eye size={14} />
            {isPending ? "심사하기" : "심사완료"}
          </button>
        );
      },
    },
  ];

  const handleReview = (request: GradePromotionRequest) => {
    setSelectedRequest(request);
    setAdminComment("");
    setIsModalOpen(true);
  };

  const processReview = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;
    
    setIsLoading(true);
    try {
      const { data: success, error } = await reviewGradePromotion({
        requestId: selectedRequest.id,
        decision,
        adminComment
      });

      if (error) {
        toast.error(error);
      } else {
        toast.success(`승급 신청이 ${decision === 'APPROVED' ? '승인' : '반려'}되었습니다.`);
        setAllData(prev => prev.map(r => 
          r.id === selectedRequest.id 
            ? { ...r, status: decision, processed_at: new Date().toISOString() } 
            : r
        ));
        setIsModalOpen(false);
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl w-fit border border-slate-200/50">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab
                ? "bg-white text-brand-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            }`}
          >
            {tab === 'ALL' ? '전체' : tab}
            <span className="ml-2 text-[10px] opacity-50">
              {allData.filter(d => tab === 'ALL' || d.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      <ZenDataGrid 
        columns={columns} 
        data={filteredData} 
        title={activeTab === 'PENDING' ? "승급 신청 대기 목록" : `등급 승급 이력 (${activeTab})`}
        description={activeTab === 'PENDING' 
          ? "현재 심사가 필요한 등급 승급 신청 내역입니다." 
          : "과거에 처리된 등급 승급 심사 이력입니다."}
      />

      <AnimatePresence>
        {isModalOpen && selectedRequest && (
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
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-brand-500" />
                  등급 승급 심사
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">현재 등급</p>
                    <p className="text-lg font-black text-slate-700">{selectedRequest.current_grade}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase">신청 등급</p>
                    <p className="text-lg font-black text-emerald-700">{selectedRequest.target_grade}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <MessageSquare size={16} />
                    신청 사유
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed border border-slate-100">
                    {selectedRequest.request_reason}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">심사 의견 (사용자에게 전달됩니다)</label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="반려 시 반려 사유를 반드시 입력해주세요."
                    className="w-full min-h-[100px] p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <ZenButton
                    onClick={() => processReview('REJECTED')}
                    disabled={isLoading}
                    variant="tactile"
                    className="bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                  >
                    반려 처리
                  </ZenButton>
                  <ZenButton
                    onClick={() => processReview('APPROVED')}
                    disabled={isLoading}
                    loading={isLoading && selectedRequest.status === 'PENDING'}
                    variant="glass"
                    className="bg-brand-600 text-white hover:bg-brand-700"
                  >
                    최종 승인
                  </ZenButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
