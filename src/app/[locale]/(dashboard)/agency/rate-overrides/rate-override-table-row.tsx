'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { deactivateAgencyRateOverride } from '@/app/actions/agency/rate-overrides';
import type { AgencyRateOverrideWithRefs } from '@/types/agency';

interface RateOverrideTableRowProps {
  override: AgencyRateOverrideWithRefs;
  onDeactivated: (id: string) => void;
  t: (key: string) => string;
}

export function RateOverrideTableRow({ override, onDeactivated, t }: RateOverrideTableRowProps) {
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateAgencyRateOverride(override.id);
      onDeactivated(override.id);
    } catch { setDeactivating(false); }
  };

  const baseRateLabel = override.base_rate
    ? `${override.base_rate.product?.product_code || ''} / ${override.base_rate.zone?.zone_code || ''} / ${override.base_rate.weight_kg}kg`
    : '-';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm text-slate-700">{baseRateLabel}</td>
      <td className="px-4 py-3 font-medium text-slate-900">{override.selling_price.toLocaleString()}</td>
      <td className="px-4 py-3 text-slate-700">{override.cost_price.toLocaleString()}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{new Date(override.valid_from).toLocaleDateString('ko-KR')}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{override.valid_until ? new Date(override.valid_until).toLocaleDateString('ko-KR') : '-'}</td>
      <td className="px-4 py-3">
        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border",
          override.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
          {override.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {override.is_active && (
          <button onClick={handleDeactivate} disabled={deactivating}
            className="px-2 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
            {deactivating ? '...' : t('agency_rate_overrides_deactivate')}
          </button>
        )}
      </td>
    </tr>
  );
}