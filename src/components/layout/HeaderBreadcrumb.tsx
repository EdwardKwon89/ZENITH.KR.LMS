"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HeaderBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const locales  = ["en", "ko"];
  const filtered = locales.includes(segments[0]) ? segments.slice(1) : segments;

  const crumbs = filtered.map((seg, i) => ({
    name:   seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href:   "/" + filtered.slice(0, i + 1).join("/"),
    isLast: i === filtered.length - 1,
  }));

  return (
    <nav className="flex items-center gap-2 text-sm">
      <span className="text-slate-400">Home</span>
      {crumbs.map((crumb) => (
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
  );
}
