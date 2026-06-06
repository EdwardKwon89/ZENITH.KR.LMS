"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { 
  ChevronRight, 
  ChevronLeft, 
  LayoutDashboard, 
  Database, 
  ShoppingCart, 
  Truck, 
  Calculator, 
  ShieldAlert,
  Settings,
  Menu,
  MessageSquare,
  UserCircle,
  HelpCircle,
  TrendingUp,
  BarChartBig,
  CalendarDays,
  FileText,
  Building,
  Users,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { checkPermission, USER_ROLES } from "@/lib/auth/rbac";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isAdminOnly?: boolean;
  children?: { title: string; href: string }[];
}

export default function NaviSidebar({ 
  user, 
  profile,
  allowedPaths
}: { 
  user?: any; 
  profile?: any;
  allowedPaths?: string[];
}) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || "ko";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const NAV_ITEMS: NavItem[] = [
    { title: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { 
      title: t("master"), 
      href: "/admin/codes", 
      icon: Database,
      isAdminOnly: true,
      children: [
        { title: t("rates"), href: "/admin/rates" },
      ]
    },
    { 
      title: t("order_mgmt"), 
      href: "/orders", 
      icon: ShoppingCart,
      children: [
        { title: t("orders"), href: "/orders" },
        { title: t("order_new"), href: "/orders/new" },
      ]
    },
    {
      title: t("logistics_group"),
      href: "/tracking",
      icon: Truck,
      children: [
        { title: t("logistics_tracking"), href: "/tracking" },
        { title: t("inventory"), href: "/inventory" },
        { title: t("logistics_inbound"), href: "/warehouse/inbound" },
        { title: t("logistics_outbound"), href: "/warehouse/outbound" },
      ]
    },
    { 
      title: t("finance_group"), 
      href: "/finance", 
      icon: Calculator,
      children: [
        { title: t("finance_revenue"), href: "/finance/revenue" },
        { title: t("finance_costs"), href: "/finance/costs" },
        { title: t("finance_transport_costs"), href: "/admin/transport-costs" },
        { title: t("finance_documents"), href: "/finance/documents" },
        { title: t("settlement"), href: "/settlement" },
      ]
    },
    { title: t("statistics"), href: "/admin/statistics", icon: BarChartBig, isAdminOnly: true },
    { title: t("schedules"), href: "/schedules", icon: CalendarDays },
    { 
      title: t("voc"), 
      href: profile?.role?.includes(USER_ROLES.ADMIN) ? "/voc/admin" : "/voc", 
      icon: MessageSquare 
    },
    { 
      title: t("support_group"), 
      href: "/support/qna", 
      icon: HelpCircle,
      children: [
        { title: t("support_qna"), href: "/support/qna" },
        { title: t("support_faq"), href: "/support/faq" },
        { title: t("support_notices"), href: "/support/notices" },
      ]
    },
    { title: t("schedules_admin"), href: "/admin/schedules", icon: CalendarDays, isAdminOnly: true },
    { title: t("claims"), href: "/admin/claims", icon: ShieldAlert, isAdminOnly: true },
    { title: t("member_management"), href: "/admin/members", icon: Users, isAdminOnly: true },
    { title: t("grade_promotion_requests"), href: "/admin/upgrade-requests", icon: TrendingUp, isAdminOnly: true },
    { title: t("org_approval"), href: "/admin/organizations", icon: Building, isAdminOnly: true },
    { title: t("customs_management"), href: "/admin/customs", icon: FileText, isAdminOnly: true },
    { title: t("customs_rates"), href: "/admin/customs-rates", icon: FileText },
    { title: t("delivery_rates"), href: "/admin/delivery-rates", icon: Truck },
    { title: t("orders_assigned"), href: "/orders/assigned", icon: ClipboardList },
    { title: t("admin_error_logs"), href: "/admin/error-logs", icon: ShieldAlert, isAdminOnly: true },
    { 
      title: t("mypage"), 
      href: "/mypage", 
      icon: UserCircle,
      children: [
        { title: t("my_profile"), href: "/mypage/profile" },
        { title: t("my_security"), href: "/mypage/security" },
        { title: t("my_grade"), href: "/mypage/grade" },
        { title: t("my_customs"), href: "/mypage/customs" },
        ...(profile?.role === USER_ROLES.CORPORATE || profile?.role === USER_ROLES.ADMIN
          ? [{ title: t("corporate_mgmt"), href: "/mypage/corporate" }]
          : []),
      ]
    },
    { title: t("settings"), href: "/admin/settings", icon: Settings, isAdminOnly: true },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("zen-sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("zen-sidebar-collapsed", String(next));
      return next;
    });
  };

  const toggleMenu = (title: string) => {
    if (isCollapsed) return;
    setOpenMenus(prev => 
      prev.includes(title) ? prev.filter(m => m !== title) : [...prev, title]
    );
  };

  return (
    <aside
      className={cn(
        "relative h-screen flex flex-col bg-white border-r border-slate-200 transition-all duration-300 zen-shadow-premium z-40",
        isCollapsed ? "items-center w-[80px]" : "items-stretch w-[280px]"
      )}
    >
      <div className={cn(
        "h-16 flex items-center px-6 border-b border-slate-100 mb-4",
        isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        {!isCollapsed && (
          <span className="text-xl font-bold font-heading text-brand-900 tracking-tight">
            ZENITH<span className="text-brand-500">_LMS</span>
          </span>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-500 transition-all"
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
        {NAV_ITEMS.filter(item => {
          const isParentAllowed = checkPermission(profile?.role || "GUEST", item.href, allowedPaths);
          const hasAllowedChild = item.children?.some(child => 
            checkPermission(profile?.role || "GUEST", child.href, allowedPaths)
          );
          return isParentAllowed || hasAllowedChild;
        }).map((item) => {
          const isActive = pathname.startsWith(`/${locale}${item.href}`);
          const isOpen = openMenus.includes(item.title);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.title} className="group">
              <div
                onClick={() => {
                  if (hasChildren) {
                    toggleMenu(item.title);
                  } else {
                    router.push(`/${locale}${item.href}`);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative",
                  isActive 
                    ? "bg-brand-50 text-brand-700 font-semibold" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <item.icon size={22} className={cn(isActive ? "text-brand-600" : "text-slate-500 Group-hover:text-slate-700")} />
                
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-[15px] truncate">{item.title}</span>
                    {hasChildren && (
                      <ChevronRight 
                        size={16} 
                        className={cn("transition-transform duration-200", isOpen && "rotate-90")} 
                      />
                    )}
                  </>
                )}

                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.title}
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "overflow-hidden pl-10 pr-2 space-y-1 mt-1 transition-all duration-200",
                  !isCollapsed && hasChildren && isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={`/${locale}${child.href}`}
                    className={cn(
                      "block py-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors",
                      pathname === `/${locale}${child.href}` && "text-brand-700 font-medium"
                    )}
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={cn(
        "p-4 border-t border-slate-100",
        isCollapsed ? "flex justify-center" : "block"
      )}>
        {!isCollapsed ? (
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs uppercase">
              {(profile?.full_name || user?.email || "U").substring(0, 2)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">
                {profile?.full_name || user?.email?.split('@')[0] || "User"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {profile?.organization || "ZENITH_LMS"}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm uppercase">
            {(profile?.full_name || user?.email || "U").substring(0, 2)}
          </div>
        )}
      </div>
    </aside>
  );
}
