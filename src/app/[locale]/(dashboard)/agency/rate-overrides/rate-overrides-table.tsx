'use client';

import type { AgencyRateOverrideWithRefs } from '@/types/agency';
import { RateOverrideTableRow } from './rate-override-table-row';

interface RateOverridesTableProps {
  overrides: AgencyRateOverrideWithRefs[];
  onDeactivated: (id: string) => void;
  t: (key: string) => string;
}

const COLS = ['base_rate', 'selling', 'cost', 'valid_from', 'valid_until', 'status', 'actions'];

export function RateOverridesTable({ overrides, onDeactivated, t }: RateOverridesTableProps) {
  if (overrides.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <p className="text-slate-500 text-sm font-medium">{t('agency_rate_overrides_title')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {COLS.map((col) => (
              <th key={col} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t(`agency_rate_overrides_${col}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {overrides.map((o) => (
            <RateOverrideTableRow key={o.id} override={o} onDeactivated={onDeactivated} t={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}