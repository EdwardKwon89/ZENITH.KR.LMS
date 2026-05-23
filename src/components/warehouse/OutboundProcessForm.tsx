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
  getWarehousedOrders,
  confirmOutbound,
  getTodayReleasedOrders,
} from "@/app/actions/warehouse";
import { OrderStatus, ORDER_STATUS_META } from "@/types/orders";
import {
  CheckCircle,
  Package,
  ArrowRight,
  Clock,
  Search,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { OrderListItem } from "@/types/orders";

const PDFDownloadLinkDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => null }
);

import ShippingLabelPDF from "@/components/documents/ShippingLabelPDF";

export default function OutboundProcessForm({ locale }: { locale: string }) {
  const t = useTranslations("WarehouseOutbound");
  const labelT = useTranslations("ShippingLabel");
  const orderStatusT = useTranslations("orderStatus");

  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [previewOrder, setPreviewOrder] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, historyRes] = await Promise.all([
        getWarehousedOrders(),
        getTodayReleasedOrders(),
      ]);
      if (orderRes.success) setOrders(orderRes.orders);
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

  const handleConfirmOutbound = async () => {
    if (selected.size === 0) {
      toast.error(t("error_none_selected"));
      return;
    }

    setSubmitLoading(true);
    try {
      const results = await Promise.all(
        Array.from(selected).map((id) => confirmOutbound(id))
      );
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        toast.success(t("success_msg"));
        setSelected(new Set());
        await fetchData();
      } else {
        toast.warning("일부 오더 출고 처리에 실패했습니다.");
      }
    } catch (err: any) {
      toast.error(err.message || "출고 확정 실패");
    } finally {
      setSubmitLoading(false);
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

  const getPkgSummary = (pkg: any) => {
    const items = pkg.items || [];
    const names = items.map((i: any) => i.item_name).join(", ");
    return {
      itemCount: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
      names: names || "-",
    };
  };

  const buildLabelData = (order: any) => {
    const pkgs = order.packages || [];
    const totalPkgs = pkgs.reduce((s: number, p: any) => s + (p.packing_count || 1), 0);
    const totalWeight = pkgs.reduce((s: number, p: any) => s + (p.gross_weight || 0), 0);
    return {
      order_no: order.order_no,
      date: new Date(order.created_at).toLocaleDateString("ko-KR"),
      shipper: {
        name: order.shipper?.name || "-",
        address: order.origin_port?.name || "",
      },
      consignee: {
        name: order.recipient_name || order.dest_port?.name || "-",
        address: order.recipient_address || order.dest_port?.name || "",
        phone: order.recipient_contact || order.recipient_phone || "-",
      },
      items: pkgs.flatMap((p: any) => {
        const items = p.items || [];
        return items.length > 0
          ? items.map((i: any) => ({
              description: i.item_name,
              quantity: i.quantity || 0,
              weight: i.weight || 0,
            }))
          : [{ description: `Package #${p.packing_count || "?"}`, quantity: 1, weight: p.gross_weight || 0 }];
      }),
      total_pkgs: totalPkgs,
      total_weight: totalWeight,
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
        <ZenCard className="zen-glass relative overflow-hidden p-6 border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {t("select_orders")}
              </h2>
              <p className="text-xs text-slate-500">
                {orders.length}개의 오더가 출고 대기 중입니다.
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
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full">
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
                const pkgs = order.packages || [];
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
                        ? "border-purple-400 ring-2 ring-purple-200 bg-purple-50/30"
                        : "border-slate-100 hover:border-slate-200"
                    )}
                    onClick={() => toggleSelect(order.id)}
                  >
                    <div className="pt-0.5">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selected.has(order.id)
                            ? "bg-purple-600 border-purple-600"
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
                        <ZenBadge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">
                          {orderStatusT(`${OrderStatus.WAREHOUSED}.label`)}
                        </ZenBadge>
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

                    <div className="flex items-center gap-2">
                      <PDFDownloadLinkDynamic
                        document={
                          <ShippingLabelPDF
                            data={buildLabelData(order)}
                            labels={{
                              shipping_label: labelT("title"),
                              order_ref: labelT("order_ref"),
                              issue_date: labelT("issue_date"),
                              shipper: labelT("shipper"),
                              consignee: labelT("consignee"),
                              phone: labelT("phone"),
                              item_desc: labelT("item_desc"),
                              qty: labelT("qty"),
                              weight: labelT("weight"),
                              total_pkgs: labelT("total_pkgs"),
                              carrier_barcode: labelT("carrier_barcode"),
                              generated_on: labelT("generated_on"),
                            }}
                          />
                        }
                        fileName={`SL_${order.order_no}.pdf`}
                      >
                        {({ loading: pdfLoading }) => (
                          <button
                            onClick={(e) => e.stopPropagation()}
                            disabled={pdfLoading}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 transition-all"
                            title={t("preview_btn")}
                          >
                            <FileText size={16} />
                          </button>
                        )}
                      </PDFDownloadLinkDynamic>
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
                    : "출고 대기 중인 WAREHOUSED 오더가 없습니다."}
                </p>
              </div>
            )}
          </div>

          {selected.size > 0 && (
            <ZenButton
              onClick={handleConfirmOutbound}
              loading={submitLoading}
              disabled={submitLoading}
              className="w-full mt-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
            >
              {t("confirm_btn")} ({selected.size})
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
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all flex items-start justify-between shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {order.order_no || "-"}
                        </span>
                        <ZenBadge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          {orderStatusT(`${OrderStatus.RELEASED}.label`)}
                        </ZenBadge>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono font-semibold flex items-center gap-1">
                      <Clock size={10} />
                      {formatKstTime(item.created_at)}
                    </span>
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
    </div>
  );
}
