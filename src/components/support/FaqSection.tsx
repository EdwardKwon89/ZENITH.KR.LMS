"use client";
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2,
  HelpCircle,
  X,
  Save
} from "lucide-react";
import { ZenButton, ZenBadge, ZenCard } from "@/components/ui/ZenUI";
import { 
  getFaqList, 
  upsertFaq, 
  deleteFaq 
} from "@/app/actions/support";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FaqSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("Support");
  const commonT = useTranslations("Common");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Admin Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [currentFaq, setCurrentFaq] = useState<any>(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const { faqs } = await getFaqList();
      if (faqs) setFaqs(faqs);
    } catch (error) {
      logger.error("Failed to load FAQs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentFaq.question || !currentFaq.answer || !currentFaq.category) return;
    try {
      await upsertFaq({
        id: currentFaq.id,
        category: currentFaq.category,
        question: currentFaq.question,
        answer: currentFaq.answer,
        order_no: currentFaq.order_no,
        is_active: currentFaq.is_active
      });
      toast.success(t("success_save"));
      setIsEditing(false);
      setCurrentFaq(null);
      loadFaqs();
    } catch (error) {
      logger.error("Failed to save FAQ", error);
      toast.error(commonT("error_save"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(commonT("confirm_delete"))) return;
    try {
      await deleteFaq(id);
      toast.success(commonT("success_delete"));
      loadFaqs();
    } catch (error) {
      logger.error("Failed to delete FAQ", error);
    }
  };

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase()) ||
    f.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(faqs.map(f => f.category)));

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder={t("faq_search")} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full h-12 bg-white zen-shadow-sm border border-slate-200 focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 rounded-2xl outline-none transition-all"
          />
        </div>
        {isAdmin && (
          <ZenButton 
            onClick={() => {
              setCurrentFaq({ category: "", question: "", answer: "", priority: 0 });
              setIsEditing(true);
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-2xl px-6 h-12 flex items-center gap-2 font-bold"
          >
            <Plus size={18} /> {t("faq_add")}
          </ZenButton>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-16 w-full bg-slate-100 animate-pulse rounded-2xl" />
          ))
        ) : filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <ZenCard className={cn(
                "border-slate-200 transition-all rounded-2xl overflow-hidden zen-shadow-sm",
                expandedId === faq.id ? "ring-2 ring-brand-100 border-brand-200" : "hover:border-slate-300"
              )}>
                <div 
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      expandedId === faq.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      <HelpCircle size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ZenBadge variant="default" className="text-[10px] uppercase tracking-wider font-bold border-slate-200 text-slate-500">
                          {faq.category}
                        </ZenBadge>
                      </div>
                      <h4 className="font-bold text-slate-900 truncate">
                        {faq.question}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                        <ZenButton 
                          variant="glass" 
                          onClick={() => {
                            setCurrentFaq(faq);
                            setIsEditing(true);
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Edit2 size={14} />
                        </ZenButton>
                        <ZenButton 
                          variant="glass" 
                          onClick={() => handleDelete(faq.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </ZenButton>
                      </div>
                      </div>
                    )}
                    {expandedId === faq.id ? <ChevronUp className="text-brand-500" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 pt-0 ml-13">
                        <div className="bg-slate-50 rounded-2xl p-6 text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">
                          {faq.answer}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ZenCard>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Search className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">{t("faq_empty")}</p>
          </div>
        )}
      </div>

      {/* Admin Edit Modal / Side Drawer */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-3xl zen-shadow-premium overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">{currentFaq?.id ? t("faq_edit") : t("faq_add")}</h3>
                <ZenButton variant="glass" className="rounded-full h-8 w-8 p-0" onClick={() => setIsEditing(false)}>
                  <X size={20} />
                </ZenButton>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t("faq_category")}</label>
                  <input 
                    value={currentFaq.category}
                    onChange={(e) => setCurrentFaq({...currentFaq, category: e.target.value})}
                    placeholder="e.g. SHIPPING, ACCOUNT, WALLET"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t("faq_question")}</label>
                  <input 
                    value={currentFaq.question}
                    onChange={(e) => setCurrentFaq({...currentFaq, question: e.target.value})}
                    placeholder="Enter the question"
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t("faq_answer")}</label>
                  <textarea 
                    value={currentFaq.answer}
                    onChange={(e) => setCurrentFaq({...currentFaq, answer: e.target.value})}
                    placeholder="Enter the detailed answer"
                    className="w-full min-h-[200px] bg-slate-50 border border-slate-200 rounded-2xl p-4 resize-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <ZenButton variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl px-6 h-12">
                    {commonT("cancel")}
                  </ZenButton>
                  <ZenButton onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-8 h-12 font-bold flex items-center gap-2">
                    <Save size={18} /> {commonT("save")}
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
