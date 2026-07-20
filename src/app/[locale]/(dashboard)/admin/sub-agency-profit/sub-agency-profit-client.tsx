'use client';

import React, { useState, useEffect } from 'react';
import { getSubAgencyProfitSummary, SubAgencyProfitRow } from '@/app/actions/finance';
import { Calendar, DollarSign, ArrowDownRight, ArrowUpRight, TrendingUp, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubAgencyProfitClient() {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [rows, setRows] = useState<SubAgencyProfitRow[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalMargin: 0,
    totalMarginRate: 0,
  });

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await getSubAgencyProfitSummary({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      setRows(res.rows);
      setSummary({
        totalRevenue: res.totalRevenue,
        totalCost: res.totalCost,
        totalMargin: res.totalMargin,
        totalMarginRate: res.totalMarginRate,
      });
    } catch (err: any) {
      toast.error(err.message || 'SNTL 수익금 집계 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSummary();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sub-Agency 납입 총액 (SNTL 매출)</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-gray-100">
            ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SNTL 실제 UPS 매입원가</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-gray-100">
            ${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SNTL 순수익 (Net Profit)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className={`text-2xl font-bold font-mono ${summary.totalMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ${summary.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">평균 수익률 (Profit %)</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-gray-100">
            {summary.totalMarginRate}%
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="flex items-center justify-between gap-3">
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

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white hover:bg-primary/95 px-6 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? '집계 중...' : '기간 조회'}
          </button>
        </form>
      </div>

      {/* Sub-Agency Profit Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-gray-200 text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Sub-Agency별 수익금 집계 내역
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">Sub-Agency 명칭</th>
                <th className="py-3.5 px-5 text-center">오더 건수</th>
                <th className="py-3.5 px-5 text-right">Sub-Agency 납입액 (SNTL 매출)</th>
                <th className="py-3.5 px-5 text-right">SNTL 실제 UPS 원가 (SNTL 매입)</th>
                <th className="py-3.5 px-5 text-right">SNTL 순수익 (Margin)</th>
                <th className="py-3.5 px-5 text-right">수익률 (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    SNTL 수익금 데이터를 집계 중입니다...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    등록된 Sub-Agency 수익금 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.agencyOrgId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-800 dark:text-gray-200">
                      {row.agencyName}
                    </td>
                    <td className="py-3.5 px-5 text-center font-semibold text-slate-600 dark:text-zinc-300">
                      {row.orderCount} 건
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-900 dark:text-gray-100">
                      ${row.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-slate-500 dark:text-zinc-400">
                      ${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-5 text-right font-mono font-bold ${row.totalMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      ${row.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-slate-600 dark:text-zinc-300">
                      {row.marginRate}%
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
