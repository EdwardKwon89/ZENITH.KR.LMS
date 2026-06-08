"use client";
import { logger } from '@/lib/logger';

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { 
  ZenCard, 
  ZenButton, 
  ZenBadge, 
  ZenInput 
} from "@/components/ui/ZenUI";
import { 
  getGradeMaster, 
  requestGradePromotion, 
  getMyProfile,
  getMyPendingPromotionRequest,
  GradeMasterItem 
} from "@/app/actions/member";
import { USER_ROLES } from "@/lib/auth/rbac";
import { toast } from "sonner";
import { Star, ArrowUpCircle, Info, CheckCircle2, Clock } from "lucide-react";

export default function MyGradePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations("Support");
  
  const [profile, setProfile] = useState<any>(null);
  const [gradeMaster, setGradeMaster] = useState<GradeMasterItem[]>([]);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [targetGrade, setTargetGrade] = useState("");
  const [requestReason, setRequestReason] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [prof, master, pending] = await Promise.all([
          getMyProfile(),
          getGradeMaster(),
          getMyPendingPromotionRequest()
        ]);
        
        setProfile(prof);
        setGradeMaster(master);
        setPendingRequest(pending);
        
        if (pending) {
          setTargetGrade(pending.target_grade ?? '');
          setRequestReason(pending.request_reason ?? '');
        }
      } catch (err) {
        logger.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingRequest) return;
    
    if (!targetGrade || !requestReason) {
      toast.error("모든 항목을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: resData, error } = await requestGradePromotion({ targetGrade, requestReason });
      if (error) {
        toast.error(error);
      } else {
        toast.success("승급 신청이 접수되었습니다.");
        // 신청 후 상태 업데이트
        const newPending = await getMyPendingPromotionRequest();
        setPendingRequest(newPending);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (profile?.role !== USER_ROLES.INDIVIDUAL) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Info className="w-12 h-12 text-stone-400 mb-4" />
        <h2 className="text-xl font-semibold text-stone-600">{t("no_grade_feature")}</h2>
      </div>
    );
  }

  const currentGradeInfo = gradeMaster.find(g => g.grade_code === profile.grade_code);
  const availableGrades = gradeMaster.filter(g => g.grade_code !== profile.grade_code);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
        <h1 className="text-3xl font-bold text-stone-800">{t("my_grade")}</h1>
      </div>

      {/* 현재 등급 카드 */}
      <ZenCard className="bg-gradient-to-br from-indigo-50/50 to-white/50 border-indigo-100">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-stone-500 font-medium">{t("current_grade")}</p>
              <h2 className="text-4xl font-black text-indigo-700 mt-1">
                {currentGradeInfo ? (locale === 'ko' ? currentGradeInfo.grade_name_ko : currentGradeInfo.grade_name_en) : profile.grade_code}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <ZenBadge variant="success" className="px-3 py-1">
                {currentGradeInfo?.discount_rate || 0}% Discount
              </ZenBadge>
              <p className="text-sm text-stone-600 italic">
                {currentGradeInfo?.benefit_desc || "No special benefits"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center p-4 bg-white/40 rounded-2xl border border-white/60">
            <CheckCircle2 className="w-16 h-16 text-indigo-400 opacity-50" />
          </div>
        </div>
      </ZenCard>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 승급 신청 폼 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-indigo-500" />
              <h3 className="text-xl font-bold text-stone-700">{t("grade_promotion_request")}</h3>
            </div>
            {pendingRequest && (
              <ZenBadge variant="warning" className="flex items-center gap-1 px-3 py-1 animate-pulse">
                <Clock className="w-3 h-3" />
                Pending Review
              </ZenBadge>
            )}
          </div>
          
          <ZenCard className={pendingRequest ? "opacity-75 grayscale-[0.5]" : ""}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-stone-600">{t("target_grade")}</label>
                <div className="grid grid-cols-2 gap-3">
                  {availableGrades.map((grade) => (
                    <label 
                      key={grade.grade_code}
                      className={cn(
                        "relative flex flex-col p-4 cursor-pointer rounded-xl border-2 transition-all",
                        targetGrade === grade.grade_code 
                          ? "border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-200" 
                          : "border-stone-100 hover:border-stone-200",
                        pendingRequest && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <input 
                        type="radio" 
                        name="targetGrade" 
                        value={grade.grade_code}
                        className="sr-only"
                        onChange={(e) => !pendingRequest && setTargetGrade(e.target.value)}
                        disabled={!!pendingRequest}
                      />
                      <span className="font-bold text-stone-800">
                        {locale === 'ko' ? grade.grade_name_ko : grade.grade_name_en}
                      </span>
                      <span className="text-xs text-stone-500 mt-1">
                        {grade.discount_rate}% Off
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-600">{t("request_reason")}</label>
                <textarea 
                  className="w-full min-h-[120px] bg-slate-50/50 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05)] disabled:opacity-50"
                  placeholder="승급이 필요한 이유를 적어주세요."
                  value={requestReason}
                  onChange={(e) => !pendingRequest && setRequestReason(e.target.value)}
                  disabled={!!pendingRequest}
                  required
                />
              </div>

              <ZenButton 
                type="submit" 
                className="w-full py-4 text-lg" 
                variant={pendingRequest ? "tactile" : "glass"}
                loading={submitting}
                disabled={!!pendingRequest}
              >
                {pendingRequest ? "Request Under Review" : t("grade_promotion_request")}
              </ZenButton>
            </form>
          </ZenCard>
        </section>

        {/* 등급 안내 섹션 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-stone-400" />
            <h3 className="text-xl font-bold text-stone-700">Grade Benefits</h3>
          </div>
          
          <div className="space-y-3">
            {gradeMaster.map((grade) => (
              <div key={grade.grade_code} className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-100">
                <div>
                  <p className="font-bold text-stone-800">
                    {locale === 'ko' ? grade.grade_name_ko : grade.grade_name_en}
                  </p>
                  <p className="text-xs text-stone-500">{grade.benefit_desc}</p>
                </div>
                <ZenBadge variant={grade.grade_code === profile.grade_code ? "success" : "default"}>
                  {grade.discount_rate}%
                </ZenBadge>
              </div>
            ))}
          </div>
          
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 leading-relaxed">
            <p>• 승급 심사는 관리자에 의해 진행되며 약 1~3일이 소요될 수 있습니다.</p>
            <p>• 허위 사실 기재 시 승급이 반려되거나 등급이 조정될 수 있습니다.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// Utility to handle class merging (assuming tailwind-merge is used in project)
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
