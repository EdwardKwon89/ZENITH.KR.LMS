'use client';

import React, { useState, useTransition } from 'react';
import {
  ShipperDailyBillingGroup,
  ShipperDailyOrderRow,
  getShipperDailyOrdersDetails,
  finalizeDailyShipperInvoices,
} from '@/app/actions/finance/daily-billing';
import { toast } from 'sonner';
import {
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface ShipperDailyBillingClientProps {
  initialGroups: ShipperDailyBillingGroup[];
  exchangeRate: number;
}

export default function ShipperDailyBillingClient({
  initialGroups,
  exchangeRate,
}: ShipperDailyBillingClientProps) {
  const [groups, setGroups] = useState<ShipperDailyBillingGroup[]>(initialGroups);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shipperFilter, setShipperFilter] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, ShipperDailyOrderRow[]>>({});
  const [loadingOrders, setLoadingOrders] = useState<Record<string, boolean>>({});

  const [isPending, startTransition] = useTransition();
  const [finalizingGroupKey, setFinalizingGroupKey] = useState<string | null>(null);

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    if (startDate && g.date < startDate) return false;
    if (endDate && g.date > endDate) return false;
    if (shipperFilter && !g.shipperName.toLowerCase().includes(shipperFilter.toLowerCase())) return false;
    return true;
  });

  // Calculate totals
  const totalOrders = filteredGroups.reduce((sum, g) => sum + g.orderCount, 0);
  const totalUsd = filteredGroups.reduce((sum, g) => sum + g.totalBillingAmountUsd, 0);
  const totalKrw = Math.round(totalUsd * exchangeRate);
  const totalFinalized = filteredGroups.reduce((sum, g) => sum + g.finalizedCount, 0);
  const totalUnfinalized = filteredGroups.reduce((sum, g) => sum + g.unfinalizedCount, 0);

  const toggleExpand = async (group: ShipperDailyBillingGroup) => {
    const key = `${group.shipperId}_${group.date}`;
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }

    setExpandedKey(key);
    if (!expandedOrders[key]) {
      setLoadingOrders((prev) => ({ ...prev, [key]: true }));
      const res = await getShipperDailyOrdersDetails(group.shipperId, group.date);
      setLoadingOrders((prev) => ({ ...prev, [key]: false }));

      if (res.success && res.orders) {
        setExpandedOrders((prev) => ({ ...prev, [key]: res.orders! }));
      } else {
        toast.error(res.error || '상세 오더 목록 조회 실패');
      }
    }
  };

  const handleBatchFinalize = async (group: ShipperDailyBillingGroup) => {
    if (group.invoiceIds.length === 0) {
      toast.error('마감할 인보이스가 없습니다.');
      return;
    }

    const reason = window.prompt(
      `[${group.shipperName} / ${group.date}] 총 ${group.invoiceIds.length}건의 인보이스를 최종 정산 마감 처리하시겠습니까?\n\nAdmin 예외 마감 사유를 입력하세요 (선택 사항):`,
      '일별 집계 최종 운임 마감'
    );

    if (reason === null) return; // User cancelled

    const key = `${group.shipperId}_${group.date}`;
    setFinalizingGroupKey(key);

    startTransition(async () => {
      const res = await finalizeDailyShipperInvoices(group.invoiceIds, reason);
      setFinalizingGroupKey(null);

      if (res.success) {
        toast.success(`${group.shipperName} (${group.date}) ${res.finalizedCount}건 정산 마감 완료!`);
        // Update local state
        setGroups((prev) =>
          prev.map((g) => {
            if (g.shipperId === group.shipperId && g.date === group.date) {
              return {
                ...g,
                finalizedCount: g.orderCount,
                unfinalizedCount: 0,
              };
            }
            return g;
          })
        );
      } else {
        toast.error(`정산 마감 중 오류 발생: ${res.errors?.join(', ') || '실패'}`);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">시작일:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">종료일:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="화주명 검색..."
              value={shipperFilter}
              onChange={(e) => setShipperFilter(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white focus:outline-none w-36"
            />
          </div>

          {(startDate || endDate || shipperFilter) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setShipperFilter('');
              }}
              className="text-xs text-rose-500 font-semibold hover:underline"
            >
              초기화
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          기준 환율: <strong className="text-amber-500">{exchangeRate.toLocaleString()} KRW/USD</strong>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-zinc-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-semibold block mb-1">총 오더 건수</span>
          <span className="text-2xl font-black font-mono text-white">{totalOrders} <span className="text-xs text-slate-400 font-normal">건</span></span>
        </div>

        <div className="bg-gradient-to-br from-amber-950 via-zinc-900 to-slate-900 text-white p-5 rounded-2xl border border-amber-500/20 shadow-md">
          <span className="text-xs text-amber-400 font-semibold block mb-1">총 청구 집계액 (USD)</span>
          <span className="text-2xl font-black font-mono text-amber-300">${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="bg-gradient-to-br from-blue-950 via-zinc-900 to-slate-900 text-white p-5 rounded-2xl border border-blue-500/20 shadow-md">
          <span className="text-xs text-blue-400 font-semibold block mb-1">추정 청구액 (KRW)</span>
          <span className="text-2xl font-black font-mono text-blue-300">₩{totalKrw.toLocaleString()}</span>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-1">정산 마감 상태</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">마감: {totalFinalized}건</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">미마감: {totalUnfinalized}건</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Daily Aggregation Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            화주별 일별 청구 집계 내역
          </h3>
          <span className="text-xs text-slate-400">총 {filteredGroups.length}개 일별 그룹</span>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            조회된 화주별 일별 청구 집계 데이터가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-900/50 text-slate-500 font-semibold border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">일자 (Date)</th>
                  <th className="py-3 px-4">화주명 (Shipper)</th>
                  <th className="py-3 px-4 text-center">오더수</th>
                  <th className="py-3 px-4 text-right">기본운임</th>
                  <th className="py-3 px-4 text-right">유류할증료</th>
                  <th className="py-3 px-4 text-right">급증수수료</th>
                  <th className="py-3 px-4 text-right">사후조정액</th>
                  <th className="py-3 px-4 text-right">총 합계 (USD / KRW)</th>
                  <th className="py-3 px-4 text-center">마감 상태</th>
                  <th className="py-3 px-4 text-center">관리 / 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredGroups.map((g) => {
                  const key = `${g.shipperId}_${g.date}`;
                  const isExpanded = expandedKey === key;
                  const isAllFinalized = g.unfinalizedCount === 0 && g.orderCount > 0;
                  const isFinalizingThis = finalizingGroupKey === key;

                  return (
                    <React.Fragment key={key}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {g.date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {g.shipperName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold">
                          {g.orderCount}건
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          ${g.totalBaseFreight.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          ${g.totalFuelSurcharge.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          ${g.totalSurgeFee.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          ${g.totalActualAdjustment.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="block font-extrabold font-mono text-amber-600 dark:text-amber-400">
                            ${g.totalBillingAmountUsd.toFixed(2)} USD
                          </span>
                          <span className="block text-[11px] font-mono text-slate-400">
                            ₩{g.estimatedBillingAmountKrw.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isAllFinalized ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              정산 마감 완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              미마감 ({g.unfinalizedCount}건)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => toggleExpand(g)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span>상세</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {!isAllFinalized && (
                              <button
                                onClick={() => handleBatchFinalize(g)}
                                disabled={isPending || isFinalizingThis}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                              >
                                {isFinalizingThis ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                )}
                                <span>일괄 마감</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Subtable Rows */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50/90 dark:bg-zinc-900/80 p-4 border-t border-b border-slate-200 dark:border-zinc-800">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {g.shipperName} ({g.date}) 소속 개별 오더 목록 ({g.orderCount}건)
                                </span>
                                <span className="text-slate-400">
                                  UPS 전용 화면으로 이동하여 사후 부가금 또는 정산 내역을 개별 관리할 수 있습니다.
                                </span>
                              </div>

                              {loadingOrders[key] ? (
                                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                                  <span>개별 오더 정보 불러오는 중...</span>
                                </div>
                              ) : (
                                <div className="overflow-x-auto bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 dark:bg-zinc-900 text-slate-500 font-semibold border-b border-slate-200 dark:border-zinc-800">
                                      <tr>
                                        <th className="py-2 px-3">오더 번호</th>
                                        <th className="py-2 px-3">상태</th>
                                        <th className="py-2 px-3">도착국</th>
                                        <th className="py-2 px-3 text-right">기본운임</th>
                                        <th className="py-2 px-3 text-right">유류할증</th>
                                        <th className="py-2 px-3 text-right">급증수수료</th>
                                        <th className="py-2 px-3 text-right">사후조정</th>
                                        <th className="py-2 px-3 text-right">합계(USD)</th>
                                        <th className="py-2 px-3 text-center">인보이스</th>
                                        <th className="py-2 px-3 text-center">바로가기</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                      {(expandedOrders[key] || []).map((ord) => (
                                        <tr key={ord.orderId} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40">
                                          <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                            {ord.orderNo}
                                          </td>
                                          <td className="py-2 px-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300">
                                              {ord.status}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">
                                            {ord.destCountryCode}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono">${ord.baseFreight.toFixed(2)}</td>
                                          <td className="py-2 px-3 text-right font-mono">${ord.fuelSurcharge.toFixed(2)}</td>
                                          <td className="py-2 px-3 text-right font-mono text-amber-600">${ord.surgeFee.toFixed(2)}</td>
                                          <td className="py-2 px-3 text-right font-mono text-blue-600">${ord.actualAdjustment.toFixed(2)}</td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                                            ${ord.totalAmountUsd.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono">
                                            {ord.invoiceNo ? (
                                              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                                {ord.invoiceNo} ({ord.isFinalized ? '마감' : '진행중'})
                                              </span>
                                            ) : (
                                              <span className="text-[11px] text-slate-400">미발행</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            <Link
                                              href={`/orders/${ord.orderId}/ups-detail`}
                                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                              <span>UPS 상세</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </Link>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
