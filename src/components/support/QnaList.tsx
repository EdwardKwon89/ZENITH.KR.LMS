"use client";
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ZenButton, ZenBadge, ZenCard } from "@/components/ui/ZenUI";
import { getQnaList } from "@/app/actions/support";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export function QnaList({ isAdmin = false, locale = "ko" }: { isAdmin?: boolean, locale?: string }) {
  const t = useTranslations("Support");
  const router = useRouter();
  const [qnas, setQnas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadQnas();
  }, []);

  const loadQnas = async () => {
    setLoading(true);
    try {
      const { qnas } = await getQnaList();
      if (qnas) setQnas(qnas);
    } catch (error) {
      logger.error("Failed to load QNAs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQnas = qnas.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.content.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <ZenBadge variant="default" className="bg-slate-50 text-slate-500 border-slate-200"><Clock size={12} className="mr-1" /> {t("status_pending")}</ZenBadge>;
      case "IN_PROGRESS":
        return <ZenBadge variant="info" className="bg-blue-50 text-blue-500 border-blue-200"><AlertCircle size={12} className="mr-1" /> {t("status_in_progress")}</ZenBadge>;
      case "ANSWERED":
        return <ZenBadge variant="success" className="bg-green-50 text-green-500 border-green-200"><CheckCircle2 size={12} className="mr-1" /> {t("status_answered")}</ZenBadge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder={t("faq_search")} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 h-11 bg-white zen-shadow-sm border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none rounded-xl transition-all"
          />
        </div>
        {!isAdmin && (
          <ZenButton 
            onClick={() => router.push(`/${locale}/support/qna/new`)}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-5 h-11 flex items-center gap-2"
          >
            <Plus size={18} /> {t("qna_new")}
          </ZenButton>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 w-full bg-slate-100 animate-pulse rounded-2xl" />
          ))
        ) : filteredQnas.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredQnas.map((qna, idx) => (
              <motion.div
                key={qna.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <ZenCard 
                  onClick={() => router.push(`/${locale}/support/qna/${qna.id}`)}
                  className="p-5 hover:bg-slate-50 border-slate-200 transition-all cursor-pointer group rounded-2xl zen-shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(qna.status)}
                        <span className="text-xs text-slate-400">
                          {format(new Date(qna.created_at), "yyyy-MM-dd HH:mm")}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 transition-colors flex items-center gap-2">
                        {qna.title}
                        {qna.order_no && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            #{qna.order_no}
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                        {qna.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {qna.answer_count > 0 && (
                        <div className="flex items-center gap-1.5 text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">
                          <MessageCircle size={14} />
                          <span className="text-xs font-bold">{qna.answer_count}</span>
                        </div>
                      )}
                      <ChevronRight className="text-slate-300 group-hover:text-brand-400 transition-colors" />
                    </div>
                  </div>
                </ZenCard>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <MessageCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">{t("empty_list")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
