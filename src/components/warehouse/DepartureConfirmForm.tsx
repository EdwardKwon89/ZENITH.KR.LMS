"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ZenButton,
  ZenCard,
  ZenBadge,
  ZenInput,
} from "@/components/ui/ZenUI";
import {
  getReleasedOrders,
  confirmDeparture,
} from "@/app/actions/operations";
import { OrderStatus, ORDER_STATUS_META } from "@/types/orders";
import {
  CheckCircle,
  Package,
  ArrowRight,
  Clock,
  Search,
  Loader2,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DepartureConfirmForm({ locale }: { locale: string }) {
  const t = useTranslations("WarehouseDeparture");
  const orderStatusT = useTranslations("orderStatus");

  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getReleasedOrders();
      if (res.success) setOrders(res.orders);
    } catch (err: any) {
      toast.error(err.message || "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredOrders.map((o) => o.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const filteredOrders = search.trim()
    ? orders.filter((o) => o.order_no?.includes(search.trim()))
    : orders;

  const handleConfirmDeparture = async () => {
    if (selected.size === 0) {
      toast.error(t("error_none_selected"));
      return;
    }

    setSubmitLoading(true);
    try {
      const orderIds = [...selected];
      let successCount = 0;
      let failCount = 0;

      for (const orderId of orderIds) {
        const res = await confirmDeparture(orderId);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(t("success_msg", { count: successCount }));
        setSelected(new Set());
        await fetchData();
      } else {
        toast.warning(t("partial_success", { success: successCount, fail: failCount }));
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "출고확정 처리 실패");
    } finally {
      setSubmitLoading(false);
    }
  };

  const getPkgSummary = (pkgs: any[]) => {
    const totalQty = pkgs.reduce((s: number, p: any) => {
      const items = p.items || [];
      return s + items.reduce((si: number, i: any) => si + (i.quantity || 0), 0);
    }, 0);
    return { pkgCount: pkgs.length, totalQty };
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <ZenCard className="zen-glass relative overflow-hidden p-6 border-white/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <Truck size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {t("select_orders")}
            </h2>
            <p className="text-xs text-slate-500">
              {orders.length}개의 오더가 출고확정 대기 중입니다.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <ZenInput
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3.5 bg-white/70"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full">
              {selected.size}개 선택됨
            </span>
            <button
              onClick={deselectAll}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {t("deselect_all")}
            </button>
            <button
              onClick={selectAll}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {t("select_all")}
            </button>
          </div>
        )}

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              <span className="text-xs font-semibold">로딩 중...</span>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const pkgs = order.order_packages || [];
              const { pkgCount, totalQty } = getPkgSummary(pkgs);

              return (
                <div
                  key={order.id}
                  className={cn(
                    "p-4 bg-white border rounded-2xl transition-all shadow-sm hover:shadow-md flex items-start gap-4 cursor-pointer",
                    selected.has(order.id)
                      ? "border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/30"
                      : "border-slate-100 hover:border-slate-200"
                  )}
                  onClick={() => toggleSelect(order.id)}
                >
                  <div className="pt-0.5">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        selected.has(order.id)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300"
                      )}
                    >
                      {selected.has(order.id) && (
                        <CheckCircle size={14} className="text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {order.order_no}
                      </span>
                      <ZenBadge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                        {orderStatusT(`${OrderStatus.RELEASED}.label`)}
                      </ZenBadge>
                      {pkgs.some((p: any) => p.intl_ref_locked) && (
                        <ZenBadge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                          UPS 라벨 발급완료
                        </ZenBadge>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700">
                          {order.shipper?.name || "-"}
                        </span>
                        <ArrowRight size={10} className="text-slate-400" />
                        <span>{order.dest_port?.code || "-"}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {pkgCount} 패키지 · {totalQty}개 품목
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <Package size={36} className="text-slate-300 mb-3" />
              <p className="text-xs font-semibold">
                {search.trim()
                  ? "검색 결과가 없습니다."
                  : "출고확정 대기 중인 오더가 없습니다."}
              </p>
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <ZenButton
            onClick={handleConfirmDeparture}
            loading={submitLoading}
            disabled={submitLoading}
            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
          >
            {submitLoading ? "처리 중..." : t("confirm_btn")} ({selected.size})
          </ZenButton>
        )}
      </ZenCard>
    </div>
  );
}
