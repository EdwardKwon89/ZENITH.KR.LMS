import Link from "next/link";
import { Users, Percent } from "lucide-react";

interface QuickLinksProps {
  locale: string;
  t: (key: string) => string;
}

export function AgencyQuickLinks({ locale, t }: QuickLinksProps) {
  return (
    <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-4">{t("agency_quick_links")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/${locale}/agency/shippers`}
          className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Users size={20} />
            </div>
            <div>
              <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                {t("agency_shippers_nav")}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                등록된 화주 목록 조회 및 할인율/등급 관리
              </span>
            </div>
          </div>
          <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
        </Link>
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/30 opacity-70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg">
              <Percent size={20} />
            </div>
            <div>
              <span className="font-bold text-slate-700 block">요율 오버라이드</span>
              <span className="text-xs text-slate-400 mt-0.5 block">
                화주별 개별 요율 오버라이드 설정 (준비 중)
              </span>
            </div>
          </div>
          <span className="text-slate-300">→</span>
        </div>
      </div>
    </div>
  );
}
