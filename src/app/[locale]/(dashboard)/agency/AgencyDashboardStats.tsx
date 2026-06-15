import { Users, ClipboardList } from "lucide-react";

interface StatsProps {
  shipperCount: number;
  ordersCount: number;
  t: (key: string) => string;
}

export function AgencyDashboardStats({ shipperCount, ordersCount, t }: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-500">{t("agency_registered_shippers")}</h3>
          <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {shipperCount}
          </p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          <Users size={24} />
        </div>
      </div>
      <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-500">이번 달 오더</h3>
          <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight group-hover:text-blue-600 transition-colors">
            {ordersCount}
          </p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
          <ClipboardList size={24} />
        </div>
      </div>
    </div>
  );
}
