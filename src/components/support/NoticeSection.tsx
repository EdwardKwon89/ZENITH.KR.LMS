"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  ChevronRight, 
  Megaphone, 
  Calendar, 
  Eye, 
  EyeOff,
  Edit2,
  Trash2,
  X,
  Save,
  Bell
} from "lucide-react";
import { ZenButton, ZenBadge, ZenCard } from "@/components/ui/ZenUI";
import { 
  getNoticeList, 
  upsertNotice, 
  deleteNotice 
} from "@/app/actions/support";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NoticeSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("Support");
  const commonT = useTranslations("Common");
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNotice, setCurrentNotice] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const { notices } = await getNoticeList();
      if (notices) setNotices(notices);
    } catch (error) {
      console.error("Failed to load notices", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentNotice.title || !currentNotice.content) return;
    try {
      await upsertNotice({
        id: currentNotice.id,
        title: currentNotice.title,
        content: currentNotice.content,
        is_important: currentNotice.is_important,
        is_published: currentNotice.is_published
      });
      toast.success(t("success_save"));
      setIsEditing(false);
      loadNotices();
    } catch (error) {
      console.error("Failed to save notice", error);
      toast.error(commonT("error_save"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(commonT("confirm_delete"))) return;
    try {
      await deleteNotice(id);
      toast.success(commonT("success_delete"));
      loadNotices();
    } catch (error) {
      console.error("Failed to delete notice", error);
    }
  };

  const togglePublish = async (notice: any) => {
    try {
      await upsertNotice({
        ...notice,
        is_published: !notice.is_published
      });
      toast.success(notice.is_published ? t("notice_unpublish") : t("notice_publish"));
      loadNotices();
    } catch (error) {
      console.error("Failed to toggle publish", error);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-end">
        {isAdmin && (
          <ZenButton 
            onClick={() => {
              setCurrentNotice({ title: "", content: "", is_important: false, is_published: true });
              setIsEditing(true);
            }}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-2xl px-6 h-12 flex items-center gap-2 font-bold"
          >
            <Plus size={18} /> {t("notice_add")}
          </ZenButton>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-20 w-full bg-slate-100 animate-pulse rounded-2xl" />
          ))
        ) : notices.length > 0 ? (
          notices.filter(n => isAdmin || n.is_published).map((notice, idx) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <ZenCard className={cn(
                "border-slate-200 transition-all rounded-2xl overflow-hidden zen-shadow-sm",
                expandedId === notice.id ? "ring-2 ring-brand-100 border-brand-200" : "hover:border-slate-300"
              )}>
                <div 
                  onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                      notice.is_important ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"
                    )}>
                      {notice.is_important ? <Bell size={22} className="animate-bounce-subtle" /> : <Megaphone size={22} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notice.is_important && (
                          <ZenBadge variant="danger" className="text-white border-transparent text-[10px] font-black uppercase tracking-widest px-1.5 h-4">
                            {t("notice_urgent")}
                          </ZenBadge>
                        )}
                        {!notice.is_published && isAdmin && (
                          <ZenBadge variant="default" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                            {t("notice_draft")}
                          </ZenBadge>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={12} /> {format(new Date(notice.created_at), "yyyy-MM-dd")}
                        </span>
                      </div>
                      <h4 className={cn(
                        "font-bold text-slate-900 transition-colors",
                        expandedId === notice.id ? "text-brand-600" : "group-hover:text-brand-500"
                      )}>
                        {notice.title}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <ZenButton 
                          variant="glass" 
                          className={cn("h-8 w-8 p-0", notice.is_published ? "text-slate-400" : "text-brand-500")}
                          onClick={() => togglePublish(notice)}
                        >
                          {notice.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                        </ZenButton>
                        <ZenButton 
                          variant="glass" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-brand-600"
                          onClick={() => {
                            setCurrentNotice(notice);
                            setIsEditing(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </ZenButton>
                        <ZenButton 
                          variant="glass" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => handleDelete(notice.id)}
                        >
                          <Trash2 size={16} />
                        </ZenButton>
                      </div>
                    )}
                    <ChevronRight className={cn(
                      "transition-transform duration-300 text-slate-300",
                      expandedId === notice.id ? "rotate-90 text-brand-400" : ""
                    )} />
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === notice.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 pt-0 ml-16">
                        <div className="bg-slate-50/50 rounded-2xl p-8 text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100/50 text-[15px]">
                          {notice.content}
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
            <Megaphone className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">{t("empty_list")}</p>
          </div>
        )}
      </div>

      {/* Admin Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl zen-shadow-premium overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                    <Megaphone size={18} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{currentNotice?.id ? t("notice_edit") : t("notice_add")}</h3>
                </div>
                <ZenButton variant="glass" className="rounded-full h-8 w-8 p-0" onClick={() => setIsEditing(false)}>
                  <X size={20} />
                </ZenButton>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t("notice_title")}</label>
                    <input 
                      value={currentNotice.title}
                      onChange={(e) => setCurrentNotice({...currentNotice, title: e.target.value})}
                      placeholder="Notice Title"
                      className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 shrink-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t("notice_important")}</label>
                    <div 
                      onClick={() => setCurrentNotice({...currentNotice, is_important: !currentNotice.is_important})}
                      className={cn(
                        "h-12 px-4 flex items-center gap-2 rounded-xl border transition-all cursor-pointer select-none",
                        currentNotice.is_important ? "bg-red-50 border-red-200 text-red-600" : "bg-slate-50 border-slate-200 text-slate-400"
                      )}
                    >
                      <Bell size={18} />
                      <span className="font-bold">{t("notice_urgent")}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t("notice_content")}</label>
                  <textarea 
                    value={currentNotice.content}
                    onChange={(e) => setCurrentNotice({...currentNotice, content: e.target.value})}
                    placeholder="Enter the notice content..."
                    className="w-full min-h-[300px] bg-slate-50 border border-slate-200 rounded-2xl p-5 resize-none text-[15px] focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <ZenButton variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl px-6 h-12">
                    {commonT("cancel")}
                  </ZenButton>
                  <ZenButton onClick={handleSave} className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-10 h-12 font-bold flex items-center gap-2">
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
