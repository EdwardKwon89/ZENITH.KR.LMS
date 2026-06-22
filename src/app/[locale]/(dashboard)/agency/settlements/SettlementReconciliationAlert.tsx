import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface UnpricedOrder {
  orderNo: string;
  shipperName: string;
  createdAt: string;
}

interface Props {
  unpricedOrders: UnpricedOrder[];
}

export function SettlementReconciliationAlert({ unpricedOrders }: Props) {
  const t = useTranslations('AgencySettlements');
  const [expanded, setExpanded] = useState(false);
  if (unpricedOrders.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left cursor-pointer">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <span className="text-sm font-bold text-amber-800">{t("settlement_reconciliation_title")}</span>
          <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{t("settlement_reconciliation_count", { count: unpricedOrders.length })}</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-amber-600" /> : <ChevronDown size={16} className="text-amber-600" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-amber-700">{t("settlement_reconciliation_desc")}</p>
          <ul className="space-y-1">
            {unpricedOrders.map((o) => (
              <li key={o.orderNo} className="text-xs text-amber-800 bg-amber-100/50 rounded-lg px-3 py-1.5 flex justify-between">
                <span className="font-mono font-medium">{o.orderNo}</span>
                <span className="text-amber-600">{o.shipperName} · {new Date(o.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
