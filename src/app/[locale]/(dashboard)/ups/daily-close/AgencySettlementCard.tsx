import type { AgencySettlementRow } from '@/lib/actions/ups-daily-close.shared';

interface Props {
  rows: AgencySettlementRow[];
  t: (key: string) => string;
}

export function AgencySettlementCard({ rows, t }: Props) {
  const totalShipperRev = rows.reduce((s, r) => s + r.shipperRevenue, 0);
  const totalAgencyRev = rows.reduce((s, r) => s + r.agencyRevenue, 0);
  const totalPkgs = rows.reduce((s, r) => s + r.pkgCount, 0);

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 mb-4">{t('agency_settlement_title')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('agency_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('pkg_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('shipper_revenue_col')}</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('agency_revenue_col')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.agencyOrgId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-2 font-medium text-slate-800">{row.agencyName}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">{row.pkgCount}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">${row.shipperRevenue.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">${row.agencyRevenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td className="py-2.5 px-2 text-slate-800">{t('total_row')}</td>
              <td className="py-2.5 px-2 text-right text-slate-800">{totalPkgs}</td>
              <td className="py-2.5 px-2 text-right text-slate-800">${totalShipperRev.toFixed(2)}</td>
              <td className="py-2.5 px-2 text-right text-slate-800">${totalAgencyRev.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
