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
  Download,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { issueUpsLabel, voidUpsLabel } from "@/app/actions/operations/ups-labels";
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
  const [showIntlWarning, setShowIntlWarning] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [issuingLabels, setIssuingLabels] = useState(false);
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [voidLoading, setVoidLoading] = useState(false);

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

    const selectedOrders = orders.filter((o) => selected.has(o.id));
    const packagesNeedingLabels = selectedOrders.flatMap((o: any) =>
      (o.order_packages || []).filter((p: any) => !p.intl_ref_locked)
    );

    if (packagesNeedingLabels.length > 0) {
      setPendingOrders(selectedOrders);
      setShowIntlWarning(true);
      return;
    }

    await executeConfirmOutbound(selectedOrders);
  };

  const issueLabelsForPackages = async (ordersToProcess: any[]): Promise<boolean> => {
    const pkgsToIssue = ordersToProcess.flatMap((o: any) =>
      (o.order_packages || []).filter((p: any) => !p.intl_ref_locked)
    );
    if (pkgsToIssue.length === 0) return true;

    setIssuingLabels(true);
    let allSucceeded = true;
    for (const pkg of pkgsToIssue) {
      const res = await issueUpsLabel(pkg.id);
      if (!res.success) {
        allSucceeded = false;
      }
    }
    setIssuingLabels(false);
    return allSucceeded;
  };

  const executeConfirmOutbound = async (ordersToProcess: any[]) => {
    await issueLabelsForPackages(ordersToProcess);
    setSubmitLoading(true);
    try {
      const results = await Promise.all(
        ordersToProcess.map((o) => confirmOutbound(o.id))
      );
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        const missingCount = results.reduce((s, r) => s + (r as any).pkgsWithoutIntlRef || 0, 0);
        if (missingCount > 0) {
          toast.warning(t("intl_ref_missing_confirmed", { count: missingCount }));
        } else {
          toast.success(t("success_msg"));
        }
        setSelected(new Set());
        setShowIntlWarning(false);
        setPendingOrders([]);
        await fetchData();
      } else {
        toast.warning("일부 오더 출고 처리에 실패했습니다.");
      }
    } catch (err: any) {
      toast.error(err.message || "출고 확정 실패");
    } finally {
      setVoidLoading(false);
    }
  };

  const handleReissue = async (packageId: string) => {
    setIssuingLabels(true);
    try {
      const res = await issueUpsLabel(packageId);
      if (res.success) {
        toast.success(t("ups_label_issued"));
        await fetchData();
      } else {
        toast.error(res.error || t("ups_label_issue_failed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("ups_label_issue_failed"));
    } finally {
      setIssuingLabels(false);
    }
  };

  const confirmWithWarning = async () => {
    await executeConfirmOutbound(pendingOrders);
  };

  const handleVoidLabel = async (packageId: string) => {
    setVoidLoading(true);
    try {
      const res = await voidUpsLabel(packageId);
      if (res.success) {
        toast.success(t("ups_label_voided"));
        setVoidTarget(null);
        await fetchData();
      } else {
        toast.error(res.error || t("ups_label_void_failed"));
      }
    } catch (err: any) {
      toast.error(err.message || t("ups_label_void_failed"));
    } finally {
      setVoidLoading(false);
    }
  };

  const getLatestLabel = (pkgs: any[]): { trackingNumber: string | null; storagePath: string | null; isVoided: boolean } | null => {
    for (const pkg of pkgs) {
      const labels = pkg.ups_labels || [];
      const active = labels.find((l: any) => !l.is_voided);
      if (active) {
        return { trackingNumber: active.tracking_number, storagePath: active.storage_path, isVoided: false };
      }
      const lastVoided = labels[labels.length - 1];
      if (lastVoided) {
        return { trackingNumber: null, storagePath: null, isVoided: true };
      }
    }
    return null;
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
    const pkgs = order.order_packages || [];
    const totalPkgs = pkgs.reduce((s: number, p: any) => s + (p.physical_box_count || 1), 0);
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
          : [{ description: `Package #${p.physical_box_count || p.packing_count || "?"}`, quantity: 1, weight: p.gross_weight || 0 }];
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
                        {pkgs.some((p: any) => p.intl_ref_locked) && (
                          <ZenBadge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                            UPS {t("ups_label_issued")}
                          </ZenBadge>
                        )}
                        {pkgs.every((p: any) => !p.intl_ref_locked) && pkgs.length > 0 && (
                          <ZenBadge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                            UPS {t("ups_label_not_issued")}
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
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(order.order_packages || []).map((pkg: any, idx: number) => (
                            <span
                              key={pkg.id || idx}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                pkg.intl_ref_locked
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              )}
                            >
                              <span className="font-mono">#{idx + 1}</span>
                              {pkg.intl_ref_locked && pkg.intl_ref_no
                                ? pkg.intl_ref_no
                                : t("intl_ref_missing")}
                            </span>
                          ))}
                        </div>
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
              loading={issuingLabels || submitLoading}
              disabled={issuingLabels || submitLoading}
              className="w-full mt-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]"
            >
              {issuingLabels ? t("ups_label_issuing") : t("confirm_btn")} ({selected.size})
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
                const labelInfo = getLatestLabel(pkgs);
                const hasActiveLabel = labelInfo && !labelInfo.isVoided && labelInfo.trackingNumber;
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
                          <ZenBadge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                            {orderStatusT(`${OrderStatus.RELEASED}.label`)}
                          </ZenBadge>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-semibold flex items-center gap-1 shrink-0">
                        <Clock size={10} />
                        {formatKstTime(item.created_at)}
                      </span>
                    </div>
                    {labelInfo && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {hasActiveLabel ? (
                          <>
                            <ZenBadge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                              UPS {t("ups_label_issued")} · {labelInfo.trackingNumber}
                            </ZenBadge>
                            {labelInfo.storagePath && (
                              <a
                                href={labelInfo.storagePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Download size={12} />
                                PDF
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetPkg = pkgs.find((p: any) =>
                                  (p.ups_labels || []).some((l: any) => !l.is_voided)
                                );
                                if (targetPkg) setVoidTarget(targetPkg.id);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <XCircle size={12} />
                              {t("ups_label_void")}
                            </button>
                          </>
                        ) : (
                          <>
                            <ZenBadge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                              {t("ups_label_voided")}
                            </ZenBadge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetPkg = pkgs.find((p: any) =>
                                  (p.ups_labels || []).some((l: any) => l.is_voided)
                                );
                                if (targetPkg) handleReissue(targetPkg.id);
                              }}
                              disabled={issuingLabels}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw size={12} />
                              {t("ups_label_reissue")}
                            </button>
                          </>
                        )}
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
      {showIntlWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t("intl_ref_warning_title")}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {t("intl_ref_warning_desc")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowIntlWarning(false); setPendingOrders([]); }}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                disabled={issuingLabels}
              >
                취소
              </button>
              <button
                onClick={confirmWithWarning}
                disabled={issuingLabels}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all disabled:opacity-50"
              >
                {issuingLabels ? t("ups_label_issuing") : t("confirm_continue")}
              </button>
            </div>
          </div>
        </div>
      )}

      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t("ups_label_void_title")}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {t("ups_label_void_desc")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setVoidTarget(null)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                disabled={voidLoading}
              >
                취소
              </button>
              <button
                onClick={() => handleVoidLabel(voidTarget)}
                disabled={voidLoading}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50"
              >
                {voidLoading ? "처리 중..." : t("ups_label_void_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
