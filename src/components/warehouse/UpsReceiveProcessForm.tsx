"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ZenButton,
  ZenCard,
  ZenBadge,
  ZenInput,
} from "@/components/ui/ZenUI";
import {
  getWarehousedOrders,
  confirmUpsRegistration,
  undoUpsRegistration,
  getTodayUpsHistory,
  getLatestUpsLabelErrors,
} from "@/app/actions/operations";
import { OrderStatus, ORDER_STATUS_META } from "@/types/orders";
import {
  CheckCircle,
  Package,
  ArrowRight,
  Clock,
  Search,
  Loader2,
  XCircle,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UpsReceiveProcessForm({ locale }: { locale: string }) {
  const t = useTranslations("WarehouseUpsReceiving");
  const orderStatusT = useTranslations("orderStatus");

  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [undoTarget, setUndoTarget] = useState<string | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [labelErrors, setLabelErrors] = useState<Record<string, any>>({});
  const [batchResults, setBatchResults] = useState<any[] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, historyRes] = await Promise.all([
        getWarehousedOrders(),
        getTodayUpsHistory(),
      ]);
      if (ordersRes.success) {
        setOrders(ordersRes.orders);
        const orderIds = (ordersRes.orders || []).map((o: any) => o.id);
        const errRes = await getLatestUpsLabelErrors(orderIds);
        if (errRes.success) setLabelErrors(errRes.errors);
      }
      if (historyRes.success) setHistory(historyRes.items);
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

  const handleConfirmRegistration = async () => {
    if (selected.size === 0) {
      toast.error(t("error_none_selected"));
      return;
    }

    setSubmitLoading(true);
    setBatchResults(null);
    try {
      const orderIds = [...selected];
      const results: any[] = [];

      for (const orderId of orderIds) {
        const order = orders.find((o: any) => o.id === orderId);
        const res = await confirmUpsRegistration(orderId);
        if (res.success) {
          results.push({ orderId, orderNo: order?.order_no || "-", success: true });
        } else {
          results.push({
            orderId,
            orderNo: order?.order_no || "-",
            success: false,
            error: res.error || "알 수 없는 오류",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast.success(t("success_msg", { count: successCount }));
      } else {
        toast.warning(t("partial_success", { success: successCount, fail: failCount }));
        setBatchResults(results);
      }

      setSelected(new Set());
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "UPS 등록 실패");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUndoRegistration = async (orderId: string) => {
    setUndoLoading(true);
    try {
      const res = await undoUpsRegistration(orderId);
      if (res.success) {
        toast.success(t("undo_success"));
        setUndoTarget(null);
        await fetchData();
      } else {
        toast.error(res.error || t("undo_failed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("undo_failed"));
    } finally {
      setUndoLoading(false);
    }
  };

  const formatKstTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
        <ZenCard className="zen-glass relative overflow-hidden p-6 border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {t("select_orders")}
              </h2>
              <p className="text-xs text-slate-500">
                {orders.length}개의 오더가 UPS 등록 대기 중입니다.
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
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
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
                const pkgCount = pkgs.length;
                const totalQty = pkgs.reduce((s: number, p: any) => {
                  const items = p.items || [];
                  return s + items.reduce((si: number, i: any) => si + (i.quantity || 0), 0);
                }, 0);

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "p-4 bg-white border rounded-2xl transition-all shadow-sm hover:shadow-md flex items-start gap-4 cursor-pointer",
                      selected.has(order.id)
                        ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50/30"
                        : "border-slate-100 hover:border-slate-200"
                    )}
                    onClick={() => toggleSelect(order.id)}
                  >
                    <div className="pt-0.5">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selected.has(order.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        )}
                      >
                        {selected.has(order.id) && (
                          <CheckCircle size={14} className="text-white" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {order.order_no}
                        </span>
                        <ZenBadge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">
                          {orderStatusT(`${OrderStatus.WAREHOUSED}.label`)}
                        </ZenBadge>
                        {labelErrors[order.id] && (
                          <ZenBadge className="bg-red-50 text-red-700 border-red-200 text-[10px] flex items-center gap-1">
                            {t("recent_fail_badge")}
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
                    : "UPS 등록 대기 중인 WAREHOUSED 오더가 없습니다."}
                </p>
              </div>
            )}
          </div>

          {selected.size > 0 && (
            <ZenButton
              onClick={handleConfirmRegistration}
              loading={submitLoading}
              disabled={submitLoading}
              className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
            >
              {submitLoading ? t("registering") : t("confirm_btn")} ({selected.size})
            </ZenButton>
          )}
        </ZenCard>
      </div>

      <div className="lg:col-span-5">
        <ZenCard className="p-6 bg-white/70 backdrop-blur-md border-slate-100 shadow-md h-full flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-md font-black text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              {t("today_history")}
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-200/50">
              오늘
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-hide pr-1 space-y-3">
            {history.length > 0 ? (
              history.map((item: any) => {
                const order = item.order || {};
                const pkgs = order.order_packages || [];
                const allLabels = pkgs.flatMap((p: any) => p.ups_labels || []);
                const latestLabel = allLabels.length > 0 ? allLabels[allLabels.length - 1] : null;
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {order.order_no || "-"}
                          </span>
                          <ZenBadge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                            {orderStatusT(`${OrderStatus.PACKED}.label`)}
                          </ZenBadge>
                        </div>
                        {order.recipient_name && (
                          <p className="text-[11px] text-slate-500 font-medium">{order.recipient_name}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {formatKstTime(item.created_at)}
                      </span>
                    </div>
                    {latestLabel && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <ZenBadge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                          UPS · {latestLabel.tracking_number || latestLabel.reference_no || "-"}
                        </ZenBadge>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <Package size={36} className="text-slate-300 mb-3" />
                <p className="text-xs font-semibold">{t("empty_history")}</p>
              </div>
            )}
          </div>
        </ZenCard>
      </div>

      {batchResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <XCircle size={20} className="text-red-500" />
                  {t("result_title")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t("result_summary", {
                    success: batchResults.filter((r) => r.success).length,
                    fail: batchResults.filter((r) => !r.success).length,
                  })}
                </p>
              </div>
              <button
                onClick={() => setBatchResults(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {batchResults.map((r, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 border rounded-2xl",
                    r.success
                      ? "bg-green-50/50 border-green-200"
                      : "bg-red-50/50 border-red-200"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.success ? (
                        <CheckCircle size={16} className="text-green-600 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-red-500 shrink-0" />
                      )}
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {r.orderNo}
                      </span>
                      <ZenBadge
                        className={cn(
                          "text-[10px]",
                          r.success
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        )}
                      >
                        {r.success ? t("result_success_badge") : t("result_fail_badge")}
                      </ZenBadge>
                    </div>
                    {!r.success && (
                      <Link
                        href={`/orders/${r.orderId}/edit`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline shrink-0"
                      >
                        {t("result_edit_link")}
                      </Link>
                    )}
                  </div>
                  {!r.success && r.error && (
                    <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 break-words">
                      {r.error}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <ZenButton
                onClick={() => setBatchResults(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl"
              >
                {t("result_confirm")}
              </ZenButton>
            </div>
          </div>
        </div>
      )}

      {undoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t("undo_title")}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {t("undo_desc")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUndoTarget(null)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                disabled={undoLoading}
              >
                취소
              </button>
              <button
                onClick={() => handleUndoRegistration(undoTarget)}
                disabled={undoLoading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50"
              >
                {undoLoading ? "처리 중..." : t("undo_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
