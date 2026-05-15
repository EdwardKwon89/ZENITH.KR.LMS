'use client';

import React, { useState, useEffect } from "react";
import ZenShell from "@/components/layout/ZenShell";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ZenButton } from "@/components/ui/ZenUI";
import { getDashboardStats, DashboardOrder, DashboardStats } from "@/app/actions/dashboard";

const statusTheme: Record<string, string> = {
  REGISTERED: "bg-brand-50 text-brand-600 border-brand-200",
  SCHEDULED: "bg-indigo-50 text-indigo-600 border-indigo-200",
  IN_TRANSIT: "bg-amber-50 text-amber-600 border-amber-200",
  DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELED: "bg-red-50 text-red-600 border-red-200",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((data) => {
      setOrders(data.orders);
      setStats(data.stats);
    }).catch(() => {
      setStats({ totalOrders: 0, inTransit: 0, delivered: 0, cancelled: 0, carrierReliability: 0 });
    }).finally(() => setLoading(false));
  }, []);

  const completedOrders = orders.filter(
    (o) => o.status === "DELIVERED" || o.status === "COMPLETED"
  ).length;

  const columns: ColumnDef<DashboardOrder>[] = [
    {
      header: "Order No",
      accessorKey: "order_no",
      cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("order_no")}</span>
    },
    {
      header: "Carrier",
      accessorKey: "shipper_name",
    },
    {
      header: "Route",
      accessorKey: "origin",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium">{row.original.origin}</span>
          <span className="text-slate-300">→</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium">{row.original.dest}</span>
        </div>
      )
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const theme = statusTheme[status] || "bg-slate-50 text-slate-600 border-slate-200";
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${theme}`}>
            {status}
          </span>
        );
      }
    },
    {
      header: "Customer",
      accessorKey: "shipper_name",
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return <span>{date ? new Date(date).toLocaleDateString() : "—"}</span>;
      }
    },
  ];

  const statCards = stats ? [
    { label: "Active Orders", value: stats.totalOrders.toString(), change: `${orders.length} recent`, color: "text-brand-600", barWidth: "w-[60%]" },
    { label: "In Transit", value: stats.inTransit.toString(), change: `${((stats.inTransit / Math.max(stats.totalOrders, 1)) * 100).toFixed(1)}%`, color: "text-amber-600", barWidth: `w-[${Math.min(stats.inTransit / Math.max(stats.totalOrders, 1) * 100, 100)}%]` },
    { label: "Delivered", value: stats.delivered.toString(), change: `${((stats.delivered / Math.max(stats.totalOrders, 1)) * 100).toFixed(1)}%`, color: "text-emerald-600", barWidth: `w-[${Math.min(stats.delivered / Math.max(stats.totalOrders, 1) * 100, 100)}%]` },
    { label: "Carrier Reliability", value: `${stats.carrierReliability}%`, change: `completed ${completedOrders}/${orders.length}`, color: "text-brand-600", barWidth: `w-[${stats.carrierReliability}%]` },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Page Heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-slate-950 tracking-tight">
              Logistics Dashboard
            </h1>
            <p className="text-slate-500 mt-1">Real-time monitoring of your global logistics flow.</p>
          </div>
          
          <div className="flex gap-3">
            <ZenButton variant="ghost" className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">
              Export Report
            </ZenButton>
            <ZenButton variant="tactile" className="px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-100">
              Create New Order
            </ZenButton>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="zen-glass p-6 rounded-2xl border border-white/20 shadow-sm animate-pulse">
                  <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
                  <div className="h-8 w-24 bg-slate-200 rounded mb-2" />
                  <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                </div>
              ))
            : statCards.map((stat, i) => (
                <div key={i} className="zen-glass p-6 rounded-2xl border border-white/20 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-white/40 transition-all duration-300 cursor-default group">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-3xl font-black font-heading text-slate-900">{stat.value}</p>
                    <p className={cn("text-xs font-bold mb-1", stat.color)}>{stat.change}</p>
                  </div>
                  <div className="mt-4 h-1.5 w-full bg-slate-100/50 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000 bg-brand-500", stat.barWidth)} />
                  </div>
                </div>
              ))}
        </div>

        {/* Main Data View */}
        <ZenDataGrid 
          title="Recent Shipments" 
          description="A detailed list of the latest house orders and their current status."
          columns={columns} 
          data={orders} 
        />
    </div>
  );
}
