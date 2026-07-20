'use client';

import React, { useState, useEffect } from 'react';
import { getOrderRevenueCostList, OrderRevenueCostRow } from '@/app/actions/finance';
import { Search, Calendar, Filter, DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight, Package, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface OrderRevenueCostClientProps {
  isAdminOrManager: boolean;
  agencies?: { id: string; name: string }[];
}

export default function OrderRevenueCostClient({ isAdminOrManager, agencies = [] }: OrderRevenueCostClientProps) {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agencyOrgId, setAgencyOrgId] = useState('');
  const [orderNo, setOrderNo] = useState('');

  const [items, setItems] = useState<OrderRevenueCostRow[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalMargin: 0,
    averageMarginRate: 0,
  });

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await getOrderRevenueCostList({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        agencyOrgId: agencyOrgId || undefined,
        orderNo: orderNo || undefined,
      });

      setItems(res.items);
      setSummary({
        totalRevenue: res.totalRevenue,
        totalCost: res.totalCost,
        totalMargin: res.totalMargin,
        averageMarginRate: res.averageMarginRate,
      });
    } catch (err: any) {
      toast.error(err.message || '매출/매입 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchList();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">총 매출액 (Billed Revenue)</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-gray-100">
            ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">총 매입 원가 (Actual Cost)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-gray-100">
            ${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">순 마진 (Net Margin)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold font-mono ${summary.totalMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ${summary.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">평균 마진율 (Margin %)</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-gray-100">
            {summary.averageMarginRate}%
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs outline-none text-slate-700 dark:text-gray-200"
            />
            <span className="text-slate-400 text-xs">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs outline-none text-slate-700 dark:text-gray-200"
            />
          </div>

          {isAdminOrManager && agencies.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={agencyOrgId}
                onChange={(e) => setAgencyOrgId(e.target.value)}
                className="bg-transparent text-xs outline-none text-slate-700 dark:text-gray-200"
              >
                <option value="">전체 대리점</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="오더 번호 검색..."
              className="bg-transparent text-xs outline-none w-full text-slate-700 dark:text-gray-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white hover:bg-primary/95 px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? '조회 중...' : '필터 적용'}
          </button>
        </form>
      </div>

      {/* Orders Revenue & Cost Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">오더 번호</th>
                <th className="py-3.5 px-4">화주명</th>
                <th className="py-3.5 px-4">목적국</th>
                <th className="py-3.5 px-4">생성일</th>
                <th className="py-3.5 px-4 text-right">매출액 (Billed)</th>
                <th className="py-3.5 px-4 text-right">매입원가 (Cost)</th>
                <th className="py-3.5 px-4 text-right">마진 (Margin)</th>
                <th className="py-3.5 px-4 text-right">마진율 (%)</th>
                <th className="py-3.5 px-4 text-center">상태</th>
                <th className="py-3.5 px-4 text-center">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    매출/매입 데이터를 조회 중입니다...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    조회 조건에 일치하는 오더 매출/매입 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.orderId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-gray-200">
                      {row.orderNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-zinc-300">
                      {row.shipperName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-zinc-300 font-semibold">
                      {row.destCountryCode}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-zinc-400">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-gray-100">
                      ${row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-zinc-400">
                      ${row.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${row.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      ${row.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-zinc-300">
                      {row.marginRate}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/orders/${row.orderId}`}
                        className="text-primary hover:text-primary/80 inline-flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title="오더 상세 보기"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
