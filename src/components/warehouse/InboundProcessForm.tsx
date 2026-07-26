"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { 
  ZenInput, 
  ZenButton, 
  ZenCard, 
  ZenBadge, 
  ZenTextarea 
} from "@/components/ui/ZenUI";
import { 
  getOrderByBarcodeOrNo, 
  confirmInbound, 
  saveInboundMeasurements,
  getTodayInboundHistory,
  cancelInbound,
} from "@/app/actions/operations";
import { OrderStatus } from "@/types/orders";
import { Search, Barcode, CheckCircle, AlertTriangle, Clock, User, Package, ArrowRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InboundProcessForm({ locale }: { locale: string }) {
  const t = useTranslations("WarehouseInbound");
  const orderStatusT = useTranslations("orderStatus");

  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [inspectStatus, setInspectStatus] = useState<"NORMAL" | "DAMAGED">("NORMAL");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [packageEdits, setPackageEdits] = useState<Record<string, { gross_weight?: string; length?: string; width?: string; height?: string }>>({});
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [freightEstimate, setFreightEstimate] = useState<{ changed: boolean; oldFreight?: number; newFreight?: number; currency?: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. 초기 데이터 및 포커스 세팅
  useEffect(() => {
    fetchHistory();
    focusInput();
  }, []);

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await getTodayInboundHistory();
      setHistory(data || []);
    } catch (err: any) {
      toast.error(err.message || "이력 로드 실패");
    }
  };

  // 2. 바코드 스캔/조회 처리
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setOrder(null);

    try {
      const result = await getOrderByBarcodeOrNo(barcode.trim());
      if (result) {
        setOrder(result);
        setInspectStatus("NORMAL");
        setNote("");
        setPackageEdits({});
        toast.success("화물을 찾았습니다.");
      } else {
        setErrorMsg(t("error_not_found"));
        toast.error(t("error_not_found"));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "오더 조회 중 오류 발생");
      toast.error(err.message || "오더 조회 중 오류 발생");
    } finally {
      setLoading(false);
      focusInput();
    }
  };

  // 공용: 패키지 수정 데이터 구성
  const buildPackageUpdates = () => {
    if (!order) return [];
    return Object.entries(packageEdits)
      .filter(([_, edits]) => Object.keys(edits).length > 0)
      .map(([packageId, edits]) => ({
        packageId,
        ...(edits.gross_weight !== undefined && { gross_weight: parseFloat(edits.gross_weight) || 0 }),
        ...(edits.length !== undefined && { length: parseFloat(edits.length) || 0 }),
        ...(edits.width !== undefined && { width: parseFloat(edits.width) || 0 }),
        ...(edits.height !== undefined && { height: parseFloat(edits.height) || 0 }),
      }));
  };

  // 3. 입고 확정 처리
  const handleConfirmInbound = async () => {
    if (!order) return;

    setSubmitLoading(true);
    try {
      const updates = buildPackageUpdates();
      const result = await confirmInbound(order.id, inspectStatus, note.trim(), updates.length > 0 ? updates : undefined);
      if (result && result.success) {
        toast.success(t("success_msg"));
        setFreightEstimate(result.freightEstimate ?? null);
        setOrder(null);
        setBarcode("");
        setNote("");
        setPackageEdits({});
        await fetchHistory();
      } else {
        throw new Error("입고 처리에 실패했습니다.");
      }
    } catch (err: any) {
      toast.error(err.message || "입고 확정 실패");
    } finally {
      setSubmitLoading(false);
      focusInput();
    }
  };

  // 3b. 측정값만 별도 저장
  const handleSaveMeasurements = async () => {
    if (!order) return;
    const updates = buildPackageUpdates();
    if (updates.length === 0) {
      toast.info("변경된 측정값이 없습니다.");
      return;
    }
    setSavingMeasurements(true);
    try {
      const result = await saveInboundMeasurements(order.id, updates);
      if (result.success) {
        toast.success("측정값이 저장되었습니다.");
        setFreightEstimate(result.freightEstimate ?? null);
      } else {
        throw new Error(result.error || "저장 실패");
      }
    } catch (err: any) {
      toast.error(err.message || "측정값 저장 실패");
    } finally {
      setSavingMeasurements(false);
    }
  };

  // 4. 입고 취소 처리
  const handleCancelInbound = async () => {
    if (!cancelTarget) return;

    setCancelLoading(true);
    try {
      const result = await cancelInbound(cancelTarget.id);
      if (result && result.success) {
        toast.success(t("cancel_success"));
        setCancelTarget(null);
        setOrder(null);
        setBarcode("");
        await fetchHistory();
      } else {
        throw new Error("입고 취소 처리에 실패했습니다.");
      }
    } catch (err: any) {
      toast.error(err.message || "입고 취소 실패");
    } finally {
      setCancelLoading(false);
      focusInput();
    }
  };

  // KST 시간 포맷 유틸리티
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" onClick={focusInput}>
      {/* 좌측: 입고/검수 스캔 영역 */}
      <div className="lg:col-span-7 space-y-6" onClick={(e) => e.stopPropagation()}>
        <ZenCard className="zen-glass relative overflow-hidden p-6 border-white/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600">
              <Barcode size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">바코드 / 오더 스캐너</h2>
              <p className="text-xs text-slate-500">화물의 운송장 바코드를 스캔하거나 오더 번호를 입력하세요.</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <ZenInput
                ref={inputRef}
                type="text"
                placeholder={t("scan_placeholder")}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={loading || submitLoading}
                className="pl-11 pr-4 py-3.5 bg-white/70 focus:bg-white"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
            <ZenButton
              type="submit"
              loading={loading}
              disabled={loading || submitLoading}
              variant="tactile"
              className="bg-brand-600 text-white hover:bg-brand-700 px-6 py-3.5 rounded-2xl"
            >
              {t("search_btn")}
            </ZenButton>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 bg-rose-50/70 border border-rose-200/50 rounded-2xl text-rose-700 text-sm flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </ZenCard>

        {/* 조회된 오더 상세 정보 및 검수 폼 */}
        {order && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 오더 기본 정보 카드 */}
            <ZenCard className="p-6 bg-white/80 border-slate-100/50 shadow-md">
              <h3 className="text-md font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
                {t("order_info")}
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs">{t("order_no")}</span>
                  <span className="font-bold text-slate-950">{order.order_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">{t("status")}</span>
                  <span className="inline-block mt-0.5">
                    <ZenBadge className={cn(
                      order.status === OrderStatus.SCHEDULED ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                      order.status === OrderStatus.HELD ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-50 text-slate-700 border-slate-200"
                    )}>
                      {orderStatusT(`${order.status}.label`)}
                    </ZenBadge>
                  </span>
                </div>
                <div className="col-span-2 border-t border-slate-100 my-1"></div>
                <div>
                  <span className="text-slate-500 block text-xs">{t("shipper")}</span>
                  <span className="font-semibold text-slate-900">{order.shipper?.name || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">{t("route")}</span>
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    {order.origin_port?.code || order.shipper_country_code || "-"}
                    <ArrowRight size={12} className="text-slate-400" />
                    {order.dest_port?.code || order.recipient_country_code || "-"}
                  </span>
                </div>
              </div>
            </ZenCard>

            {/* 품목 리스트 카드 */}
            <ZenCard className="p-6 bg-white/80 border-slate-100/50 shadow-md">
              <h3 className="text-md font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
                {t("item_list")}
              </h3>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100/70 text-slate-600 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">{t("history_order_no")} (SKU)</th>
                      <th className="px-4 py-3">품명</th>
                      <th className="px-4 py-3 text-right">수량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-white/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.sku_code || "-"}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.item_name}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 text-right">{item.quantity}</td>
                      </tr>
                    ))}
                    {(!order.items || order.items.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-xs">
                          품목 정보가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ZenCard>

            {/* 부피/중량 수정 카드 */}
            {order.packages && order.packages.length > 0 && (
              <ZenCard className="p-6 bg-white/80 border-slate-100/50 shadow-md">
                <h3 className="text-md font-black text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                  {t("weight_volume_edit")}
                </h3>
                <p className="text-xs text-slate-500 mb-4">{t("weight_volume_desc")}</p>
                
                <div className="space-y-4">
                  {order.packages.map((pkg: any) => {
                    const edits = packageEdits[pkg.id] || {};
                    return (
                      <div key={pkg.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Package size={14} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-700">{pkg.packing_unit || "패키지"} #{pkg.id.substring(0, 8)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">중량 (kg)</label>
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={pkg.gross_weight || ''}
                              onChange={(e) => setPackageEdits(prev => ({
                                ...prev,
                                [pkg.id]: { ...prev[pkg.id], gross_weight: e.target.value }
                              }))}
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                              placeholder={pkg.gross_weight ? `${pkg.gross_weight}` : '0'}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">길이 (cm)</label>
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={pkg.length || ''}
                              onChange={(e) => setPackageEdits(prev => ({
                                ...prev,
                                [pkg.id]: { ...prev[pkg.id], length: e.target.value }
                              }))}
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                              placeholder={pkg.length ? `${pkg.length}` : '0'}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">너비 (cm)</label>
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={pkg.width || ''}
                              onChange={(e) => setPackageEdits(prev => ({
                                ...prev,
                                [pkg.id]: { ...prev[pkg.id], width: e.target.value }
                              }))}
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                              placeholder={pkg.width ? `${pkg.width}` : '0'}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">높이 (cm)</label>
                            <input
                              type="number"
                              step="0.1"
                              defaultValue={pkg.height || ''}
                              onChange={(e) => setPackageEdits(prev => ({
                                ...prev,
                                [pkg.id]: { ...prev[pkg.id], height: e.target.value }
                              }))}
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all"
                              placeholder={pkg.height ? `${pkg.height}` : '0'}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <ZenButton
                  onClick={handleSaveMeasurements}
                  loading={savingMeasurements}
                  disabled={savingMeasurements}
                  variant="tactile"
                  className="w-full mt-2 bg-slate-700 text-white hover:bg-slate-800 rounded-xl"
                >
                  측정값 저장
                </ZenButton>

                {freightEstimate?.changed && freightEstimate.oldFreight !== freightEstimate.newFreight && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    예상 운임 변경: {freightEstimate.currency} {freightEstimate.oldFreight?.toLocaleString()} → {freightEstimate.currency} {freightEstimate.newFreight?.toLocaleString()}
                  </div>
                )}
              </ZenCard>
            )}

            {/* 검수 및 확정 카드 */}
            <ZenCard className="p-6 bg-white/80 border-slate-100/50 shadow-lg relative overflow-hidden">
              <h3 className="text-md font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
                {t("inspect_status")}
              </h3>

              <div className="space-y-5">
                {/* 검수 상태 라디오 선택 */}
                <div className="grid grid-cols-2 gap-4">
                  <label className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                    inspectStatus === "NORMAL" 
                      ? "bg-blue-50/70 border-blue-500/50 text-blue-700 font-bold shadow-[0_4px_12px_rgba(59,130,246,0.1)]" 
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}>
                    <input 
                      type="radio" 
                      name="inspectStatus" 
                      value="NORMAL" 
                      checked={inspectStatus === "NORMAL"} 
                      onChange={() => setInspectStatus("NORMAL")}
                      className="sr-only"
                    />
                    <CheckCircle size={20} className={inspectStatus === "NORMAL" ? "text-blue-500" : "text-slate-400"} />
                    <span>{t("inspect_normal")}</span>
                  </label>

                  <label className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                    inspectStatus === "DAMAGED" 
                      ? "bg-rose-50/70 border-rose-500/50 text-rose-700 font-bold shadow-[0_4px_12px_rgba(244,63,94,0.1)]" 
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}>
                    <input 
                      type="radio" 
                      name="inspectStatus" 
                      value="DAMAGED" 
                      checked={inspectStatus === "DAMAGED"} 
                      onChange={() => setInspectStatus("DAMAGED")}
                      className="sr-only"
                    />
                    <AlertTriangle size={20} className={inspectStatus === "DAMAGED" ? "text-rose-500" : "text-slate-400"} />
                    <span>{t("inspect_damaged")}</span>
                  </label>
                </div>

                {/* 메모 입력 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">{t("notes")}</label>
                  <ZenTextarea
                    placeholder={t("notes_placeholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="bg-white/70"
                  />
                </div>

                {/* 입고 확정 버튼 */}
                <ZenButton
                  onClick={handleConfirmInbound}
                  loading={submitLoading}
                  disabled={submitLoading}
                  className={cn(
                    "w-full py-4 text-white font-bold rounded-2xl shadow-md transition-all active:scale-[0.98]",
                    inspectStatus === "NORMAL" 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {t("confirm_btn")}
                </ZenButton>

                {order.status === OrderStatus.WAREHOUSED && (
                  <ZenButton
                    onClick={() => setCancelTarget(order)}
                    disabled={submitLoading}
                    variant="ghost"
                    className="w-full py-3 rounded-2xl text-rose-600 hover:bg-rose-50"
                  >
                    <XCircle size={16} className="mr-2" />
                    {t("cancel_btn")}
                  </ZenButton>
                )}
              </div>
            </ZenCard>
          </div>
        )}

        {/* 입고 취소 확인 모달 */}
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
                  disabled={cancelLoading}
                  className="rounded-xl"
                >
                  닫기
                </ZenButton>
                <ZenButton
                  onClick={handleCancelInbound}
                  loading={cancelLoading}
                  disabled={cancelLoading}
                  className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl"
                >
                  {t("cancel_btn")}
                </ZenButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 우측: 오늘 입고 이력 영역 */}
      <div className="lg:col-span-5" onClick={(e) => e.stopPropagation()}>
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
                const isDamaged = item.reason && item.reason.includes("손상");
                return (
                  <div 
                    key={item.id} 
                    className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all flex items-start justify-between shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {item.order?.order_no || "-"}
                        </span>
                        <span className="inline-block">
                          <ZenBadge className={cn(
                            "text-[10px] py-0.5 px-2",
                            isDamaged 
                              ? "bg-rose-50 text-rose-700 border-rose-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {isDamaged ? "손상" : "정상"}
                          </ZenBadge>
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <p className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span>화주: {item.order?.shipper?.name || "-"}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          담당: {item.operator?.full_name || "시스템"}
                        </p>
                        {item.reason && (
                          <p className="bg-slate-50 p-2 rounded-lg border border-slate-100/50 text-[11px] text-slate-600 font-medium italic mt-1.5">
                            {item.reason.replace(/\[검수: (정상|손상)\]\s*/, "") || "-"}
                          </p>
                        )}
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
