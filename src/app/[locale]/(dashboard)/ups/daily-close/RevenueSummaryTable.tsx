import { Download } from 'lucide-react';
import { DailyRevenueRow } from '@/lib/actions/ups-daily-close';

interface Props {
  rows: DailyRevenueRow[];
  onCsvExport: () => void;
  t: (key: string) => string;
}

export function RevenueSummaryTable({ rows, onCsvExport, t }: Props) {
  const totals: DailyRevenueRow = {
    date: t('total_row'),
    pkgCount: rows.reduce((s, r) => s + r.pkgCount, 0),
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    cost: rows.reduce((s, r) => s + r.cost, 0),
    margin: rows.reduce((s, r) => s + r.margin, 0),
    marginRate: 0,
  };
  totals.marginRate = totals.revenue > 0
    ? Math.round((totals.margin / totals.revenue) * 10000) / 100
    : 0;

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700">{t('revenue_title')}</h3>
        <button
          onClick={onCsvExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <Download size={14} />
          {t('csv_export')}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('date_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('pkg_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('revenue_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('cost_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('margin_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('margin_rate_col')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.date} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-2 font-medium text-slate-800">{row.date}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">{row.pkgCount}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">${row.revenue.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">${row.cost.toFixed(2)}</td>
                <td className={`py-2.5 px-2 text-right font-medium ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${row.margin.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right text-slate-700">{row.marginRate}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td className="py-2.5 px-2 text-slate-800">{totals.date}</td>
              <td className="py-2.5 px-2 text-right text-slate-800">{totals.pkgCount}</td>
              <td className="py-2.5 px-2 text-right text-slate-800">${totals.revenue.toFixed(2)}</td>
              <td className="py-2.5 px-2 text-right text-slate-800">${totals.cost.toFixed(2)}</td>
              <td className={`py-2.5 px-2 text-right ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totals.margin.toFixed(2)}
              </td>
              <td className="py-2.5 px-2 text-right text-slate-800">{totals.marginRate}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
