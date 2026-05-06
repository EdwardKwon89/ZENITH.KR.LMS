"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ChevronRight,
  MessageSquareReply
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ZenButton, ZenBadge, ZenCard } from "@/components/ui/ZenUI";
import { getOrderQnaList, answerQna } from "@/app/actions/support";
import { getVocList } from "@/app/actions/voc";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OrderQnaSectionProps {
  orderId: string;
  orderNo: string;
  isAdmin?: boolean;
  locale?: string;
}

export function OrderQnaSection({ 
  orderId, 
  orderNo, 
  isAdmin = false, 
  locale = "ko" 
}: OrderQnaSectionProps) {
  const t = useTranslations("Support");
  const tVoc = useTranslations("VOC");
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Reply States
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isFinal, setIsFinal] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, [orderId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const [qnaData, vocData] = await Promise.all([
        getOrderQnaList(orderId),
        getVocList({ order_id: orderId })
      ]);
      
      const normalizedQnas = qnaData.map(q => ({ 
        ...q, 
        _type: 'QNA' 
      }));
      
      const normalizedVocs = (vocData.success ? vocData.vocs : []).map(v => ({ 
        ...v, 
        _type: 'VOC',
        title: `[VOC] ${v.title}`,
        content: v.description
      }));
      
      const merged = [...normalizedQnas, ...normalizedVocs].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setItems(merged);
    } catch (error) {
      console.error("Failed to load order items", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = async (qnaId: string) => {
    if (!replyContent.trim()) {
      toast.error("답변 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await answerQna({
        qnaId,
        content: replyContent,
        isFinal
      });
      toast.success("답변이 성공적으로 등록되었습니다.");
      setReplyingTo(null);
      setReplyContent("");
      await loadItems();
    } catch (error: any) {
      toast.error(error.message || "답변 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, itemType: string) => {
    if (status === "IN_PROGRESS") {
      return (
        <ZenBadge variant="info" className="bg-blue-50 text-blue-500 border-blue-200">
          <AlertCircle size={12} className="mr-1" /> {t("status_in_progress")}
        </ZenBadge>
      );
    }

    if (itemType === 'VOC') {
      switch (status) {
        case "OPEN":
          return (
            <ZenBadge variant="default" className="bg-slate-50 text-slate-500 border-slate-200">
              <Clock size={12} className="mr-1" /> {tVoc("status_open")}
            </ZenBadge>
          );
        case "CLOSED":
          return (
            <ZenBadge variant="success" className="bg-green-50 text-green-500 border-green-200">
              <CheckCircle2 size={12} className="mr-1" /> {tVoc("status_closed")}
            </ZenBadge>
          );
        default:
          return null;
      }
    } else {
      switch (status) {
        case "PENDING":
          return (
            <ZenBadge variant="default" className="bg-slate-50 text-slate-500 border-slate-200">
              <Clock size={12} className="mr-1" /> {t("status_pending")}
            </ZenBadge>
          );
        case "ANSWERED":
          return (
            <ZenBadge variant="success" className="bg-green-50 text-green-500 border-green-200">
              <CheckCircle2 size={12} className="mr-1" /> {t("status_answered")}
            </ZenBadge>
          );
        default:
          return null;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            {t("qna_title")}
          </h3>
          <p className="text-xs text-slate-500 mt-1">이 오더와 관련된 1:1 상담 및 VOC 내역입니다.</p>
        </div>
        {!isAdmin && (
          <ZenButton 
            onClick={() => router.push(`/${locale}/support/qna/new?orderId=${orderId}&orderNo=${orderNo}`)}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-4 h-10 flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> {t("qna_new")}
          </ZenButton>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(2).fill(0).map((_, i) => (
            <div key={i} className="h-20 w-full bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
          ))
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group"
              >
                <ZenCard 
                  className={cn(
                    "p-0 border-slate-200 dark:border-neutral-800 transition-all overflow-hidden rounded-2xl zen-shadow-sm",
                    replyingTo === item.id && "ring-2 ring-brand-500 border-transparent shadow-brand-100"
                  )}
                >
                  {/* Item Summary Row */}
                  <div 
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
                    onClick={() => {
                        if (replyingTo === item.id) setReplyingTo(null);
                        else {
                          const path = item._type === 'VOC' ? 'voc' : 'support/qna';
                          router.push(`/${locale}/${path}/${item.id}`);
                        }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {getStatusBadge(item.status, item._type)}
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(item.created_at), "yyyy-MM-dd HH:mm")}
                        </span>
                        {item._type === 'VOC' && (
                          <ZenBadge variant="outline" className="text-[9px] h-4 px-1.5 border-brand-200 text-brand-600">
                            VOC
                          </ZenBadge>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {item.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isAdmin && item.status !== "ANSWERED" && item.status !== "CLOSED" && item._type === 'QNA' && (
                        <ZenButton
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (replyingTo === item.id) setReplyingTo(null);
                            else {
                                setReplyingTo(item.id);
                                setReplyContent("");
                            }
                          }}
                          className={cn(
                            "h-8 px-3 text-xs rounded-lg flex items-center gap-1.5 border transition-all",
                            replyingTo === item.id 
                                ? "bg-brand-600 text-white border-brand-600" 
                                : "bg-brand-50 text-brand-600 hover:bg-brand-100 border-brand-100"
                          )}
                        >
                          <MessageSquareReply size={14} />
                          {replyingTo === item.id ? "닫기" : "바로 답변"}
                        </ZenButton>
                      )}
                      <div className="flex items-center gap-3 shrink-0">
                        {item.answer_count > 0 && (
                          <div className="flex items-center gap-1 text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-lg">
                            <MessageCircle size={12} />
                            <span className="text-[10px] font-bold">{item.answer_count}</span>
                          </div>
                        )}
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Reply Form (Admin Only, QNA Only for now) */}
                  <AnimatePresence>
                    {replyingTo === item.id && item._type === 'QNA' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30"
                      >
                        <div className="p-4 space-y-4">
                            <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs text-slate-600 dark:text-slate-400">
                                <p className="font-bold mb-1 text-slate-800 dark:text-slate-200">문의 내용 미리보기:</p>
                                <p className="line-clamp-3 italic">"{item.content}"</p>
                            </div>

                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={t("answer_placeholder")}
                                className="w-full min-h-[120px] bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                            />

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        checked={isFinal} 
                                        onChange={(e) => setIsFinal(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                        {t("answer_final")} (상태를 '답변 완료'로 전환)
                                    </span>
                                </label>

                                <div className="flex gap-2">
                                    <ZenButton 
                                        variant="ghost" 
                                        onClick={() => setReplyingTo(null)}
                                        className="h-9 px-4 text-xs"
                                    >
                                        취소
                                    </ZenButton>
                                    <ZenButton
                                        loading={submitting}
                                        onClick={() => handleQuickReply(item.id)}
                                        className="h-9 px-6 text-xs bg-brand-600 text-white hover:bg-brand-700 rounded-xl"
                                    >
                                        답변 등록
                                    </ZenButton>
                                </div>
                            </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ZenCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 dark:bg-neutral-900/30 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-neutral-800">
            <MessageCircle className="mx-auto text-slate-300 mb-2 opacity-50" size={32} />
            <p className="text-slate-400 text-sm font-medium">{t("empty_list")}</p>
            {!isAdmin && (
              <p className="text-[10px] text-slate-400 mt-1">문의 사항이 있으시면 '문의하기' 버튼을 눌러주세요.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

