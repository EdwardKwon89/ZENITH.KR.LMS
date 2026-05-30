"use client";
import { logger } from '@/lib/logger';

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { 
  Send, 
  ArrowLeft,
  Link as LinkIcon,
  HelpCircle
} from "lucide-react";
import { ZenButton, ZenCard } from "@/components/ui/ZenUI";
import { createQna } from "@/app/actions/support";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function QnaForm({ 
  locale = "ko",
  defaultOrderId = "",
  defaultOrderNo = ""
}: { 
  locale?: string;
  defaultOrderId?: string;
  defaultOrderNo?: string;
}) {
  const t = useTranslations("Support");
  const commonT = useTranslations("Common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    orderId: defaultOrderId
  });
  const [orderNo, setOrderNo] = useState(defaultOrderNo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    setLoading(true);
    try {
      await createQna({
        title: formData.title,
        content: formData.content,
        order_id: formData.orderId || undefined
      });
      toast.success(t("success_create"));
      if (formData.orderId) {
        router.push(`/${locale}/orders/${formData.orderId}`);
      } else {
        router.push(`/${locale}/support/qna`);
      }
      router.refresh();
    } catch (error) {
      logger.error("Failed to submit inquiry", error);
      toast.error(t("error_submit"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <ZenCard className="max-w-3xl mx-auto p-8 rounded-3xl zen-shadow-premium border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">
              {commonT("title")}
            </label>
            <input 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t("qna_title")}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 rounded-xl outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">
              {t("qna_content")}
            </label>
            <textarea 
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder={t("qna_content")}
              className="w-full min-h-[240px] bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 rounded-2xl resize-none p-4 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1.5">
              <LinkIcon size={14} />
              {t("qna_order_link")}
              {defaultOrderId && (
                <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full border border-brand-100 uppercase ml-1">
                  Auto-Linked
                </span>
              )}
            </label>
            <div className="relative">
              <input 
                value={orderNo || formData.orderId}
                onChange={(e) => {
                  setOrderNo(e.target.value);
                  setFormData(prev => ({ ...prev, orderId: e.target.value }));
                }}
                placeholder={t("order_id_placeholder")}
                readOnly={!!defaultOrderId}
                className={`w-full h-12 px-4 border rounded-xl outline-none transition-all ${
                  defaultOrderId 
                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                    : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                }`}
              />
              {defaultOrderId && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                </div>
              )}
            </div>
            {defaultOrderId && (
              <p className="text-[11px] text-slate-400 ml-1">
                Linked to system ID: {formData.orderId.substring(0, 8)}...
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 gap-4">
            <ZenButton 
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="rounded-xl px-6 h-12 flex items-center gap-2 border-slate-200 text-slate-600"
            >
              <ArrowLeft size={18} /> {commonT("back")}
            </ZenButton>
            <ZenButton 
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-8 h-12 flex items-center gap-2 font-bold min-w-[160px]"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} /> {commonT("submit")}
                </>
              )}
            </ZenButton>
          </div>
        </form>
      </ZenCard>
      
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
        <HelpCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-bold text-blue-900 mb-1">{t("inquiry_info_title")}</p>
          <p className="text-sm text-blue-700 leading-relaxed">
            {t("inquiry_info_desc")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

