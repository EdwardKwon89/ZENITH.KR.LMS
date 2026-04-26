"use client";

import React from "react";
import { Toaster } from "sonner";

interface ZenShellProps {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar: React.ReactNode;
  user?: any;
  profile?: any;
}

export default function ZenShell({ children, header, sidebar, user, profile }: ZenShellProps) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Fixed Sidebar */}
      {sidebar}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        {header}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        <Toaster position="top-right" richColors />

      {/* Optional Footer */}
        <footer className="px-8 py-4 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
          <span>© 2026 SNTL LOGISTICS. All rights reserved.</span>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-slate-600">Privacy Policy</span>
            <span className="cursor-pointer hover:text-slate-600">Terms of Service</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
