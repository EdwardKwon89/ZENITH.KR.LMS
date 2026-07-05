'use client';

import type { UpsBaseRateWithRefs } from '@/types/ups';

export function OverrideFormFields({ baseRates, t }: { baseRates: UpsBaseRateWithRefs[]; t: (key: string) => string }) {
  return (
    <>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('agency_rate_overrides_base_rate')} *</label>
        <select name="base_rate_id" required className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          {baseRates.map((r) => (
            <option key={r.id} value={r.id}>
              {r.product?.product_code ?? r.product_id} / {r.zone?.zone_code ?? r.zone_id} / {r.weight_kg}kg — {r.selling_price.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('agency_rate_overrides_selling')} *</label>
        <input name="selling_price" type="number" step="0.01" min="0" required
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <p className="text-[10px] text-slate-400 mt-1.5">{t('agency_rate_overrides_selling_hint')}</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('agency_rate_overrides_cost_label')}</label>
        <div className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-400">
          {t('agency_rate_overrides_cost_auto')}
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">{t('agency_rate_overrides_cost_hint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('agency_rate_overrides_valid_from')} *</label>
          <input name="valid_from" type="date" required
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('agency_rate_overrides_valid_until')}</label>
          <input name="valid_until" type="date"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>
    </>
  );
}