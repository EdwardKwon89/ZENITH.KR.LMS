import React from "react";
import { getTranslations } from "next-intl/server";
import { Search, User, Settings, HelpCircle, Building } from "lucide-react";
import { getNotifications } from "@/app/actions/notifications";
import NotificationBell from "@/components/notifications/NotificationBell";
import LogoutButton from "./LogoutButton";
import { Link } from "@/i18n/routing";

export default async function GlobalHeader({ user, profile }: { user?: any; profile?: any }) {
  const t = await getTranslations("Header");

  const { notifications, unreadCount } = await getNotifications(20, 0).catch(() => ({
    notifications: [],
    unreadCount: 0,
  }));

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 zen-shadow-premium">
      <div className="flex items-center gap-6">
        <HeaderBreadcrumb />
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={t("search_placeholder")}
            className="pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />

        <div className="h-8 w-[1px] bg-slate-200 mx-2" />

        <div className="group relative">
          <button className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold text-slate-900">
                {profile?.full_name || user?.email?.split("@")[0] || "User"}
              </span>
              <span className="text-[10px] text-brand-600 font-medium bg-brand-50 px-1.5 rounded-md flex items-center gap-1">
                <Building size={10} />
                {profile?.organization || "ZENITH_LMS"}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200">
              {(profile?.full_name || user?.email || "U").substring(0, 2).toUpperCase()}
            </div>
          </button>

          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible shadow-xl transition-all translate-y-2 group-hover:translate-y-0 z-50">
            <div className="px-3 py-2 border-b border-slate-100 mb-2">
              <p className="text-xs text-slate-400">{t("signed_in_as")}</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {user?.email || "unknown@zenith.kr"}
              </p>
            </div>
            <div className="space-y-0.5">
              <Link href="/mypage/profile" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all">
                <User size={16} /> {t("my_profile")}
              </Link>
              <Link href="/mypage/corporate" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all">
                <Settings size={16} /> {t("workspace_settings")}
              </Link>
              <Link href="/support/qna" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all">
                <HelpCircle size={16} /> {t("support_center")}
              </Link>
            </div>
            <div className="h-[1px] bg-slate-100 my-2 mx-1" />
            <LogoutButton label={t("logout")} />
          </div>
        </div>
      </div>
    </header>
  );
}

// 브레드크럼은 pathname이 필요하므로 클라이언트 컴포넌트로 분리
import HeaderBreadcrumb from "./HeaderBreadcrumb";
