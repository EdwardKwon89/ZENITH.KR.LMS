'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, CalendarDays } from 'lucide-react';
import { getDailyOutboundSummary, getDailyRevenueSummary, getDailyCloseHistory } from '@/lib/actions/ups-daily-close';
import type { DailyOutboundSummary, DailyRevenueRow } from '@/lib/actions/ups-daily-close.shared';
import { OutboundSummaryCard } from './OutboundSummaryCard';
import { RevenueSummaryTable } from './RevenueSummaryTable';

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DailyCloseClient() {
  const t = useTranslations('UpsDailyClose');
  const [fromDate, setFromDate] = useState(weekAgoStr());
  const [toDate, setToDate] = useState(todayStr());
  const [outbound, setOutbound] = useState<DailyOutboundSummary | null>(null);
  const [revenueRows, setRevenueRows] = useState<DailyRevenueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summary, revenue, history] = await Promise.all([
        getDailyOutboundSummary(toDate),
        getDailyRevenueSummary(toDate),
        getDailyCloseHistory(fromDate, toDate),
      ]);
      setOutbound(summary);
      setRevenueRows([
        ...(revenue.rows.length > 0 && !history.rows.find(r => r.date === revenue.rows[0].date)
          ? revenue.rows
          : []),
        ...history.rows.sort((a, b) => a.date.localeCompare(b.date)),
      ]);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const handleCsvExport = useCallback(() => {
    if (revenueRows.length === 0) return;
    const headers = ['Date', 'Pkgs', 'Revenue', 'Cost', 'Margin', 'MarginRate'];
    const lines = revenueRows.map(r =>
      [r.date, r.pkgCount, r.revenue, r.cost, r.margin, `${r.marginRate}%`].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-close-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [revenueRows, fromDate, toDate]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <CalendarDays size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('select_date')} (From)</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('select_date')} (To)</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          <Search size={16} />
          {t('search_btn')}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
      )}

      {!loading && outbound && (
        <OutboundSummaryCard summary={outbound} t={t} />
      )}

      {!loading && revenueRows.length > 0 && (
        <RevenueSummaryTable rows={revenueRows} onCsvExport={handleCsvExport} t={t} />
      )}

      {!loading && !outbound && revenueRows.length === 0 && !error && (
        <div className="text-center py-12 text-slate-400 text-sm">{t('no_data')}</div>
      )}
    </div>
  );
}
