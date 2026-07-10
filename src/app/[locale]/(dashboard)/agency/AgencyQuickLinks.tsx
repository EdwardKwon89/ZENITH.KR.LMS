import Link from "next/link";
import { Users, DollarSign } from "lucide-react";

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
        <Link
          href={`/${locale}/agency/ups-rates`}
          className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-green-50/30 hover:border-green-200 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="font-bold text-slate-900 block group-hover:text-green-600 transition-colors">
                UPS 요율 조회
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Zone별 기준요금·유류할증·부가요금 정보 및 대리점 원가 조회
              </span>
            </div>
          </div>
          <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}
