"use client";

import React, { useState } from 'react';
import { getVocList, answerVoc, updateVocStatus, VocItem, VocDetail, getVocDetail } from '@/app/actions/voc';
import { ZenCard, ZenButton, ZenBadge, ZenInput } from '@/components/ui/ZenUI';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Search, Filter, ChevronRight, User, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AdminVocClientProps {
  initialVocs: VocItem[];
  t: any;
}

export default function AdminVocClient({ initialVocs, t }: AdminVocClientProps) {
  const [vocs, setVocs] = useState<VocItem[]>(initialVocs);
  const [selectedVocId, setSelectedVocId] = useState<string | null>(null);
  const [selectedVocDetail, setSelectedVocDetail] = useState<VocDetail | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchVocDetail = async (id: string) => {
    setIsLoadingDetail(true);
    const result = await getVocDetail(id);
    if (result.success) {
      setSelectedVocDetail(result.data);
    } else {
      toast.error('상세 정보 로드 실패', { description: result.error });
    }
    setIsLoadingDetail(false);
  };

  const handleSelectVoc = (id: string) => {
    setSelectedVocId(id);
    fetchVocDetail(id);
  };

  const handleSendAnswer = async () => {
    if (!selectedVocId || !answerContent.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await answerVoc({
        vocId: selectedVocId,
        content: answerContent
      });
      
      if (!result.success) {
        toast.error('답변 등록 실패', { description: result.error });
        return;
      }

      toast.success(t.success_answer);
      setAnswerContent('');
      // 상세 정보 다시 로드
      await fetchVocDetail(selectedVocId);
      // 목록 갱신 (상태가 IN_PROGRESS로 변했을 수 있음)
      const listResult = await getVocList();
      if (listResult.success) {
        setVocs(listResult.vocs ?? []);
      }
    } catch (err: any) {
      toast.error('답변 등록 실패', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseVoc = async () => {
    if (!selectedVocId) return;

    try {
      const result = await updateVocStatus(selectedVocId, 'CLOSED');
      if (!result.success) {
        toast.error('상태 변경 실패', { description: result.error });
        return;
      }
      
      toast.success('VOC가 종료 처리되었습니다.');
      await fetchVocDetail(selectedVocId);
      const listResult = await getVocList();
      if (listResult.success) {
        setVocs(listResult.vocs ?? []);
      }
    } catch (err: any) {
      toast.error('상태 변경 실패', { description: err.message });
    }
  };

  const filteredVocs = filterStatus === 'ALL' 
    ? vocs 
    : vocs.filter(v => v.status === filterStatus);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'CLOSED': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)]">
      {/* VOC List Pane */}
      <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between bg-white dark:bg-neutral-900 p-2 rounded-2xl border border-slate-100 dark:border-neutral-800 shadow-sm">
          <div className="flex gap-1">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black rounded-xl transition-all",
                  filterStatus === s 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "text-slate-400 hover:bg-slate-50"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {filteredVocs.map((voc) => (
            <ZenCard 
              key={voc.id}
              onClick={() => handleSelectVoc(voc.id)}
              className={cn(
                "cursor-pointer transition-all border-2",
                selectedVocId === voc.id 
                  ? "border-blue-500 bg-blue-50/30 shadow-lg shadow-blue-100" 
                  : "border-transparent hover:border-slate-200"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <ZenBadge variant={getStatusBadgeVariant(voc.status)} className="text-[10px] px-2">
                    {voc.status}
                  </ZenBadge>
                  <span className="text-[10px] font-mono text-slate-400">#{voc.order_no}</span>
                </div>
                <h4 className="font-bold text-slate-800 truncate">{voc.title}</h4>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>{voc.type}</span>
                  <span>{new Date(voc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </ZenCard>
          ))}
        </div>
      </div>

      {/* VOC Detail & Answer Pane */}
      <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-[2rem] border border-slate-100 dark:border-neutral-800 shadow-xl overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {selectedVocId ? (
            isLoadingDetail ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm font-bold text-slate-400 tracking-widest">LOADING DETAIL...</p>
                </div>
              </motion.div>
            ) : selectedVocDetail && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Detail Header */}
                <div className="p-6 border-b border-slate-50 dark:border-neutral-800 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 tracking-tight">{selectedVocDetail.title}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        ORDER #{selectedVocDetail.order_no} · {selectedVocDetail.type}
                      </p>
                    </div>
                  </div>
                  {selectedVocDetail.status !== 'CLOSED' && (
                    <ZenButton 
                      variant="ghost" 
                      onClick={handleCloseVoc}
                      className="text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl py-1.5 px-3 text-[10px] font-black"
                    >
                      CLOSE VOC
                    </ZenButton>
                  )}
                </div>

                {/* Content & Answers */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {/* Customer Question */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User size={16} className="text-slate-500" />
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedVocDetail.description}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-3 font-bold">
                        {new Date(selectedVocDetail.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Answers List */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Admin Responses</span>
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>

                    {selectedVocDetail.answers.map((ans) => (
                      <div key={ans.id} className="flex gap-4 justify-end">
                        <div className="flex-1 bg-blue-600 text-white rounded-2xl p-4 shadow-lg shadow-blue-100">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {ans.content}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] font-black opacity-60 uppercase">{ans.answered_by_name}</span>
                            <span className="text-[10px] opacity-60">
                              {new Date(ans.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                          <CheckCircle2 size={16} className="text-blue-600" />
                        </div>
                      </div>
                    ))}

                    {selectedVocDetail.answers.length === 0 && (
                      <div className="text-center py-8">
                        <div className="inline-flex p-4 bg-amber-50 rounded-full text-amber-400 mb-2">
                          <Clock size={32} />
                        </div>
                        <p className="text-xs font-bold text-slate-400">PENDING RESPONSE</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Answer Input */}
                {selectedVocDetail.status !== 'CLOSED' ? (
                  <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <div className="relative">
                      <textarea
                        value={answerContent}
                        onChange={(e) => setAnswerContent(e.target.value)}
                        placeholder="이곳에 답변을 입력하세요..."
                        className="w-full bg-white border border-slate-200 rounded-[1.5rem] p-4 pr-14 text-sm focus:ring-2 focus:ring-blue-400/30 focus:outline-none transition-all min-h-[100px] resize-none shadow-inner"
                      />
                      <button
                        onClick={handleSendAnswer}
                        disabled={!answerContent.trim() || isSubmitting}
                        aria-label={t.submit_answer}
                        className="absolute bottom-4 right-4 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors disabled:bg-slate-200 disabled:text-slate-400 shadow-xl shadow-slate-200"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Send size={18} />
                            <span className="sr-only">{t.submit_answer}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 ml-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      답변 등록 시 VOC 상태가 자동으로 <span className="font-bold text-amber-500">'처리 중'</span>으로 변경됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50/50 border-t border-slate-100 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                      <CheckCircle size={16} />
                      이 VOC는 종료되었습니다
                    </div>
                  </div>
                )}
              </motion.div>
            )
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6">
                <MessageSquare size={40} />
              </div>
              <h4 className="text-lg font-bold text-slate-400 tracking-tight">Select a VOC to manage</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-[240px]">
                좌측 목록에서 관리할 VOC를 선택하여 답변을 등록하거나 상태를 관리하세요.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
