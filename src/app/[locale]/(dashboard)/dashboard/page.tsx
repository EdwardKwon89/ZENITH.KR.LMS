import React from "react";
import ZenShell from "@/components/layout/ZenShell";
import ZenDataGrid from "@/components/ui/ZenDataGrid";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "lucide-react"; 
import { cn } from "@/lib/utils";


// Mock Data Structure for Logistics Orders
interface Order {
  id: string;
  orderNo: string;
  carrier: string;
  route: string;
  status: "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  estimatedDate: string;
  customer: string;
}

const MOCK_ORDERS: Order[] = [
  { id: "1", orderNo: "ZN-2026-0001", carrier: "DHL Global", route: "ICN -> JFK", status: "IN_TRANSIT", estimatedDate: "2026-04-22", customer: "SNTL-Tech" },
  { id: "2", orderNo: "ZN-2026-0002", carrier: "FedEx", route: "ICN -> LHR", status: "READY", estimatedDate: "2026-04-23", customer: "Global-Biz" },
  { id: "3", orderNo: "ZN-2026-0003", carrier: "UPS", route: "NRT -> LAX", status: "COMPLETED", estimatedDate: "2026-04-18", customer: "Logi-Core" },
  { id: "4", orderNo: "ZN-2026-0004", carrier: "DHL Global", route: "SIN -> FRA", status: "READY", estimatedDate: "2026-04-25", customer: "Euro-Link" },
  { id: "5", orderNo: "ZN-2026-0005", carrier: "K-Logis", route: "ICN -> PVG", status: "CANCELLED", estimatedDate: "2026-04-19", customer: "Asia-Trade" },
  // ... adding more to see pagination effect
  ...Array.from({ length: 30 }, (_, i) => ({
    id: (i + 6).toString(),
    orderNo: `ZN-2026-00${(i + 6).toString().padStart(2, "0")}`,
    carrier: i % 2 === 0 ? "DHL" : "FedEx",
    route: "ICN -> SFO",
    status: "READY" as any,
    estimatedDate: "2026-05-01",
    customer: "Bulk-Partner"
  }))
];

const columns: ColumnDef<Order>[] = [
  {
    header: "Order No",
    accessorKey: "orderNo",
    cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("orderNo")}</span>
  },
  {
    header: "Carrier",
    accessorKey: "carrier",
  },
  {
    header: "Route",
    accessorKey: "route",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium">{row.original.route.split(" -> ")[0]}</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium">{row.original.route.split(" -> ")[1]}</span>
      </div>
    )
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const theme = {
        READY: "bg-blue-50 text-blue-600 border-blue-200",
        IN_TRANSIT: "bg-amber-50 text-amber-600 border-amber-200",
        COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
        CANCELLED: "bg-red-50 text-red-600 border-red-200",
      }[status] || "bg-slate-50 text-slate-600 border-slate-200";
      
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${theme}`}>
          {status}
        </span>
      );
    }
  },
  {
    header: "Customer",
    accessorKey: "customer",
  },
  {
    header: "Est. Date",
    accessorKey: "estimatedDate",
  },
];

export default function DashboardPage() {
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
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all zen-shadow-tactile">
              Export Report
            </button>
            <button className="px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-all zen-shadow-premium">
              Create New Order
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Active Orders", value: "1,284", change: "+12.5%", color: "text-brand-600" },
            { label: "Total Revenue", value: "$42.5k", change: "+8.2%", color: "text-emerald-600" },
            { label: "Transit Failure", value: "0.2%", change: "-1.1%", color: "text-red-600" },
            { label: "Carrier Reliability", value: "99.4%", change: "+0.3%", color: "text-brand-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 zen-shadow-premium hover:border-brand-300 transition-all cursor-default group">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-3xl font-bold font-heading text-slate-900">{stat.value}</p>
                <p className={cn("text-xs font-bold mb-1", stat.color)}>{stat.change}</p>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-1000", i === 3 ? "bg-brand-500 w-[94%]" : "bg-brand-500 w-[60%]")}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Data View */}
        <ZenDataGrid 
          title="Recent Shipments" 
          description="A detailed list of the latest house orders and their current status."
          columns={columns} 
          data={MOCK_ORDERS} 
        />
    </div>
  );
}
