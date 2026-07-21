"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ZenInput,
  ZenButton,
  ZenCard,
  ZenBadge,
} from "@/components/ui/ZenUI";
import {
  getPickupOrders,
  confirmPickup,
  cancelPickup,
  getTodayPickupHistory,
} from "@/app/actions/operations";
import { OrderStatus } from "@/types/orders";
import {
  Search,
  Package,
  Clock,
  User,
  ArrowRight,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PickupProcessForm({ locale }: { locale: string }) {
  const t = useTranslations("WarehousePickup");
  const orderStatusT = useTranslations("orderStatus");

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPickupOrders();
      setOrders(result.orders || []);
    } catch (err: any) {
      toast.error(err.message || "픽업 대상 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getTodayPickupHistory();
      setHistory(data || []);
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchHistory();
  }, [fetchOrders, fetchHistory]);

  const filteredOrders = orders.filter((o) =>
    !search.trim() || o.order_no?.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmPickup = async () => {
    if (!confirmTarget) return;
    setSubmitLoading(confirmTarget.id);
    try {
      await confirmPickup(confirmTarget.id);
      toast.success(t("confirm_success"));
      setConfirmTarget(null);
      await Promise.all([fetchOrders(), fetchHistory()]);
    } catch (err: any) {
      toast.error(err.message || "픽업 처리 실패");
    } finally {
      setSubmitLoading(null);
    }
  };

  const handleCancelPickup = async () => {
    if (!cancelTarget) return;
    setSubmitLoading(cancelTarget.id);
    try {
      await cancelPickup(cancelTarget.id);
      toast.success(t("cancel_success"));
      setCancelTarget(null);
      await Promise.all([fetchOrders(), fetchHistory()]);
    } catch (err: any) {
      toast.error(err.message || "픽업 취소 실패");
    } finally {
      setSubmitLoading(null);
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
      {/* 좌측: 픽업 대상 오더 목록 */}
      <div className="lg:col-span-7 space-y-6">
        <ZenCard className="zen-glass relative overflow-hidden p-6 border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{t("title")}</h2>
              <p className="text-xs text-slate-500">{t("no_pickup_orders")}</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); }} className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <ZenInput
                type="text"
                placeholder={t("search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loading || !!submitLoading}
                className="pl-11 pr-4 py-3.5 bg-white/70 focus:bg-white"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Clock size={20} className="animate-spin mr-2" />
              <span className="text-sm">로딩 중...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold">{t("no_pickup_orders")}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {order.order_no || "-"}
                        </span>
                        <ZenBadge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                          {orderStatusT(`${order.status}.label`)}
                        </ZenBadge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {order.shipper?.name || "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <ZenButton
                        onClick={() => setConfirmTarget(order)}
                        loading={submitLoading === order.id}
                        disabled={!!submitLoading}
                        className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-3 py-1.5 rounded-xl"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        {t("confirm_btn")}
                      </ZenButton>
                      <ZenButton
                        variant="ghost"
                        onClick={() => setCancelTarget(order)}
                        disabled={!!submitLoading}
                        className="text-xs px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50"
                      >
                        <XCircle size={14} className="mr-1" />
                        {t("cancel_btn")}
                      </ZenButton>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600 bg-slate-50/50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5">
                      <ArrowRight size={12} className="text-slate-400" />
                      <span>{order.origin_port?.code || "-"} → {order.dest_port?.code || "-"}</span>
                    </div>
                    {order.pickup_location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="truncate">{order.pickup_location}</span>
                      </div>
                    )}
                    {order.pickup_contact_name && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span>{order.pickup_contact_name}</span>
                      </div>
                    )}
                    {order.pickup_contact_tel && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <span>{order.pickup_contact_tel}</span>
                      </div>
                    )}
                  </div>

                  {order.order_packages && order.order_packages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {order.order_packages.map((pkg: any) => (
                        <ZenBadge key={pkg.id} className="bg-slate-100 text-slate-600 text-[10px]">
                          {pkg.packing_unit || "PKG"} x {pkg.packing_count || 0}
                        </ZenBadge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ZenCard>
      </div>

      {/* 우측: 오늘 픽업 이력 */}
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
              history.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all flex items-start justify-between shadow-sm hover:shadow-md"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {item.order?.order_no || "-"}
                      </span>
                      <ZenBadge className="bg-cyan-50 text-cyan-700 border-cyan-200 text-[10px]">
                        픽업완료
                      </ZenBadge>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span>{item.order?.shipper?.name || "-"}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        담당: {item.operator?.full_name || "시스템"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold flex items-center gap-1">
                    <Clock size={10} />
                    {formatKstTime(item.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <Package size={36} className="text-slate-300 mb-3" />
                <p className="text-xs font-semibold">{t("empty_history")}</p>
              </div>
            )}
          </div>
        </ZenCard>
      </div>

      {/* 픽업 완료 확인 모달 */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t("confirm_btn")}</h3>
                <p className="text-xs text-slate-500">{t("confirm_confirm")}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-6 text-sm space-y-1">
              <p><span className="text-slate-500">오더번호:</span> <span className="font-bold">{confirmTarget.order_no}</span></p>
              <p><span className="text-slate-500">화주:</span> {confirmTarget.shipper?.name}</p>
              {confirmTarget.pickup_location && (
                <p><span className="text-slate-500">픽업장소:</span> {confirmTarget.pickup_location}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <ZenButton
                variant="ghost"
                onClick={() => setConfirmTarget(null)}
                disabled={!!submitLoading}
                className="rounded-xl"
              >
                취소
              </ZenButton>
              <ZenButton
                onClick={handleConfirmPickup}
                loading={submitLoading === confirmTarget.id}
                disabled={!!submitLoading}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
              >
                {t("confirm_btn")}
              </ZenButton>
            </div>
          </div>
        </div>
      )}

      {/* 픽업 취소 확인 모달 */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t("cancel_btn")}</h3>
                <p className="text-xs text-slate-500">{t("cancel_confirm")}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-6 text-sm space-y-1">
              <p><span className="text-slate-500">오더번호:</span> <span className="font-bold">{cancelTarget.order_no}</span></p>
            </div>

            <div className="flex gap-3 justify-end">
              <ZenButton
                variant="ghost"
                onClick={() => setCancelTarget(null)}
                disabled={!!submitLoading}
                className="rounded-xl"
              >
                닫기
              </ZenButton>
              <ZenButton
                onClick={handleCancelPickup}
                loading={submitLoading === cancelTarget.id}
                disabled={!!submitLoading}
                className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl"
              >
                {t("cancel_btn")}
              </ZenButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
