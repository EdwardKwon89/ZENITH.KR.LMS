"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  LayoutDashboard, 
  Database, 
  ShoppingCart, 
  Truck, 
  Calculator, 
  ShieldCheck, 
  Settings,
  Menu,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { checkPermission } from "@/lib/auth/rbac";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isAdminOnly?: boolean;
  children?: { title: string; href: string }[];
}

export default function NaviSidebar({ user, profile }: { user?: any; profile?: any }) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const params = useParams();
  const locale = params?.locale as string || "ko";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const NAV_ITEMS: NavItem[] = [
    { title: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { 
      title: t("master"), 
      href: "/master", 
      icon: Database,
      isAdminOnly: true,
      children: [
        { title: t("master_codes"), href: "/master/codes" },
        { title: t("master_geo"), href: "/master/geo" },
        { title: t("master_mapping"), href: "/master/mapping" },
        { title: t("master_rates"), href: "/master/rates" },
      ]
    },
    { 
      title: t("order_mgmt"), 
      href: "/order", 
      icon: ShoppingCart,
      children: [
        { title: t("order_house"), href: "/order/house" },
        { title: t("order_import"), href: "/order/import" },
      ]
    },
    { title: t("logistics"), href: "/logistics", icon: Truck },
    { title: t("logistics_tracking"), href: "/tracking", icon: LayoutDashboard },
    { title: t("inventory"), href: "/inventory", icon: Package },
    { title: t("finance"), href: "/finance", icon: Calculator },
    { title: t("governance"), href: "/governance", icon: ShieldCheck, isAdminOnly: true },
    { title: t("settings"), href: "/settings", icon: Settings },
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
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className={cn(
        "relative h-screen flex flex-col bg-white border-r border-slate-200 transition-colors duration-300 zen-shadow-premium z-40",
        isCollapsed ? "items-center" : "items-stretch"
      )}
    >
      <div className={cn(
        "h-16 flex items-center px-6 border-b border-slate-100 mb-4",
        isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold font-heading text-brand-900 tracking-tight"
          >
            ZENITH<span className="text-brand-500">_LMS</span>
          </motion.span>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 text-slate-500 transition-all"
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
        {NAV_ITEMS.filter(item => checkPermission(profile?.role || "GUEST", item.href)).map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isOpen = openMenus.includes(item.title);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.title} className="group">
              <div
                onClick={() => {
                  if (hasChildren) {
                    toggleMenu(item.title);
                  } else {
                    window.location.href = `/${locale}${item.href}`;
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative",
                  pathname.startsWith(`/${locale}${item.href}`) 
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

              <AnimatePresence>
                {!isCollapsed && hasChildren && isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-10 pr-2 space-y-1 mt-1"
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
                  </motion.div>
                )}
              </AnimatePresence>
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
    </motion.aside>
  );
}
