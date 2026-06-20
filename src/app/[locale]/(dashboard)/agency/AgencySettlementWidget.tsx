import { PackageOpen, DollarSign, TrendingDown, Percent } from "lucide-react";

interface SettlementData {
  orderCount: number;
  totalRevenue: number;
  totalCost: number;
  marginRate: number;
}
interface Props {
  data: SettlementData;
  t: (key: string) => string;
}
export function AgencySettlementWidget({ data, t }: Props) {
  const cards = [
    { label: t("agency_settlement_orders"), value: data.orderCount, icon: PackageOpen, color: "blue" },
    { label: t("agency_settlement_revenue"), value: `$${data.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "green" },
    { label: t("agency_settlement_cost"), value: `$${data.totalCost.toFixed(2)}`, icon: TrendingDown, color: "orange" },
    { label: t("agency_settlement_margin_rate"), value: `${data.marginRate.toFixed(1)}%`, icon: Percent, color: "purple" },
  ];
  const colorMap: Record<string, { bg: string; text: string; group: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", group: "group-hover:bg-blue-600 group-hover:text-white" },
    green: { bg: "bg-green-50", text: "text-green-600", group: "group-hover:bg-green-600 group-hover:text-white" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", group: "group-hover:bg-orange-600 group-hover:text-white" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", group: "group-hover:bg-purple-600 group-hover:text-white" },
  };
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
        {t("agency_settlement_widget_title")}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const c = colorMap[card.color];
          return (
            <div key={card.label} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{card.label}</span>
                <div className={`p-2 ${c.bg} ${c.text} rounded-lg ${c.group} transition-all duration-300`}>
                  <card.icon size={16} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
