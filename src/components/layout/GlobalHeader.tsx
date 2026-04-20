"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { 
  Bell, 
  Search, 
  ChevronRight, 
  User, 
  LogOut, 
  Settings,
  HelpCircle,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function GlobalHeader({ user, profile }: { user?: any; profile?: any }) {
  const t = useTranslations("Header");
  const pathname = usePathname();
  
  const pathSegments = pathname.split("/").filter(Boolean);
  const locales = ["en", "ko"];
  const filteredSegments = locales.includes(pathSegments[0]) ? pathSegments.slice(1) : pathSegments;

  const breadcrumbs = filteredSegments.map((segment, index) => ({
    name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " "),
    href: "/" + filteredSegments.slice(0, index + 1).join("/"),
    isLast: index === filteredSegments.length - 1
  }));

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 zen-shadow-premium">
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">{t("home")}</span>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <ChevronRight size={14} className="text-slate-300" />
              <span className={cn(
                "transition-colors",
                crumb.isLast ? "text-slate-900 font-bold" : "text-slate-500 hover:text-brand-600"
              )}>
                {crumb.name}
              </span>
            </React.Fragment>
          ))}
        </nav>
        
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
        <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full relative transition-all">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

        <div className="group relative">
          <button className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold text-slate-900">{profile?.full_name || user?.email?.split('@')[0] || "User"}</span>
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
              <p className="text-sm font-bold text-slate-900 truncate">{user?.email || "unknown@zenith.kr"}</p>
            </div>
            <div className="space-y-0.5">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all">
                <User size={16} /> {t("my_profile")}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all">
                <Settings size={16} /> {t("workspace_settings")}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-all">
                <HelpCircle size={16} /> {t("support_center")}
              </button>
            </div>
            <div className="h-[1px] bg-slate-100 my-2 mx-1"></div>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all">
              <LogOut size={16} /> {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
