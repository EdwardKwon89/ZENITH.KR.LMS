"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  MessageSquare,
  Clock,
  User,
  Shield,
  Send,
  Link as LinkIcon
} from "lucide-react";
import { ZenButton, ZenBadge, ZenCard } from "@/components/ui/ZenUI";
import { getQnaDetail, answerQna } from "@/app/actions/support";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QnaDetail({ qnaId, isAdmin = false, locale = "ko" }: { qnaId: string, isAdmin?: boolean, locale?: string }) {
  const t = useTranslations("Support");
  const commonT = useTranslations("Common");
  const router = useRouter();
  const [qna, setQna] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answerContent, setAnswerContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQna();
  }, [qnaId]);

  const loadQna = async () => {
    setLoading(true);
    try {
      const data = await getQnaDetail(qnaId);
      if (data) setQna(data);
    } catch (error) {
      console.error("Failed to load QNA detail", error);
      toast.error("Failed to load QNA detail");
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnswer = async () => {
    if (!answerContent.trim()) return;
    setSubmitting(true);
    try {
      await answerQna({ qnaId, content: answerContent, isFinal: true });
      toast.success(t("success_answer"));
      setAnswerContent("");
      loadQna();
    } catch (error) {
      console.error("Failed to post answer", error);
      toast.error("Failed to post answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-3xl w-full" />
      <div className="h-32 bg-slate-50 rounded-2xl w-3/4 ml-auto" />
    </div>
  );

  if (!qna) return <div>Inquiry not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <ZenButton 
        variant="ghost" 
        onClick={() => router.back()}
        className="text-slate-500 hover:text-brand-600 -ml-2"
      >
        <ArrowLeft size={18} className="mr-2" /> {commonT("back")}
      </ZenButton>

      {/* Question Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZenCard className="p-8 rounded-3xl zen-shadow-premium border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-16 -mt-16 opacity-50" />
          
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <ZenBadge variant={qna.status === 'ANSWERED' ? "success" : "default"} className={cn(
              "px-3 py-1 font-bold",
              qna.status === 'ANSWERED' ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"
            )}>
              {t(`status_${qna.status.toLowerCase()}`)}
            </ZenBadge>
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Clock size={14} /> {format(new Date(qna.created_at), "yyyy-MM-dd HH:mm")}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">
            {qna.title}
          </h2>

          <div className="bg-slate-50/50 rounded-2xl p-6 mb-6 min-h-[120px] text-slate-700 leading-relaxed relative z-10 whitespace-pre-wrap">
            {qna.content}
          </div>

          {qna.order_id && (
            <div className="flex items-center gap-2 text-sm text-brand-600 font-medium bg-brand-50 w-fit px-3 py-1.5 rounded-full relative z-10">
              <LinkIcon size={14} />
              {t("related_order")}: {qna.order_id}
            </div>
          )}
        </ZenCard>
      </motion.div>

      {/* Answers Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1">
          <MessageSquare size={20} className="text-brand-500" />
          {t("answer_count")} ({qna.answers?.length || 0})
        </h3>

        <div className="space-y-4">
          {qna.answers?.map((ans: any, idx: number) => (
            <motion.div
              key={ans.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-end"
            >
              <div className="w-full max-w-[90%] bg-white border border-slate-100 rounded-3xl p-6 zen-shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                      <Shield size={14} />
                    </div>
                    <span className="text-sm font-bold text-slate-900">ZENITH Support</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {format(new Date(ans.created_at), "yyyy-MM-dd HH:mm")}
                  </span>
                </div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                  {ans.content}
                </div>
              </div>
            </motion.div>
          ))}

          {qna.answers?.length === 0 && !isAdmin && (
            <div className="text-center py-10 text-slate-400 text-sm">
              {t("waiting_answer")}
            </div>
          )}
        </div>
      </div>

      {/* Admin Answer Input */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
        >
          <ZenCard className="p-6 rounded-3xl zen-shadow-premium border-brand-100 bg-brand-50/30">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-brand-500" />
              <span className="font-bold text-slate-900">{t("admin_answer_write")}</span>
            </div>
            <textarea 
              value={answerContent}
              onChange={(e) => setAnswerContent(e.target.value)}
              placeholder={t("answer_placeholder")}
              className="w-full min-h-[120px] bg-white border border-slate-200 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 rounded-2xl p-4 mb-4 resize-none outline-none transition-all"
            />
            <div className="flex justify-end">
              <ZenButton 
                onClick={handlePostAnswer}
                disabled={submitting || !answerContent.trim()}
                className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-8 flex items-center gap-2 font-bold"
              >
                {submitting ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} /> {t("answer_final")}
                  </>
                )}
              </ZenButton>
            </div>
          </ZenCard>
        </motion.div>
      )}
    </div>
  );
}
