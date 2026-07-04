'use client';

import type { AgencyShipperRow } from '@/types/agency';
import { ShipperTableRow } from './shipper-table-row';

interface ShipperTableProps {
  shippers: AgencyShipperRow[];
  t: (key: string) => string;
}

export function ShipperTable({ shippers, t }: ShipperTableProps) {
  if (shippers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <p className="text-slate-500 text-sm font-medium">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {['name', 'type', 'grade', 'discount_rate', 'status', 'created_at', 'actions'].map((col) => (
              <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t(`col_${col}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shippers.map((shipper) => (
            <ShipperTableRow
              key={shipper.id}
              shipper={shipper}
              t={t}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
