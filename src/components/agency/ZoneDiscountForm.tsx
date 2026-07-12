'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Save } from 'lucide-react';
import { getShipperZoneDiscounts, upsertShipperZoneDiscounts } from '@/app/actions/agency/zone-discounts';
import type { UpsZoneWithCountries } from '@/types/ups';

interface ZoneDiscountFormProps {
  shipperOrgId: string;
  shipperType: string;
  zones: UpsZoneWithCountries[];
}

export function ZoneDiscountForm({ shipperOrgId, shipperType, zones }: ZoneDiscountFormProps) {
  const t = useTranslations('AgencyShippers');
  const [zoneRates, setZoneRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getShipperZoneDiscounts(shipperOrgId);
        const map: Record<string, number> = {};
        for (const d of data) map[d.zone_id] = Number(d.discount_rate);
        setZoneRates(map);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shipperOrgId]);

  if (shipperType !== 'CORPORATE') return null;

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const result = await upsertShipperZoneDiscounts(shipperOrgId, zoneRates);
      if (!result.success) {
        setError(result.fieldErrors?._form || '저장에 실패했습니다.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-sm text-slate-500">Loading zone discounts...</p>
      </div>
    );
  }

  const activeZones = zones.filter(z => z.is_active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Zone별 할인율</h3>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? t('loading') : t('form_save')}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {activeZones.map(zone => (
            <div key={zone.id} className="flex items-center gap-2">
              <span className="w-10 text-xs font-mono font-bold text-slate-600 shrink-0">{zone.zone_code}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={zoneRates[zone.id] != null ? Math.round(Number(zoneRates[zone.id]) * 1000) / 10 : ''}
                onChange={(e) => setZoneRates({
                  ...zoneRates,
                  [zone.id]: e.target.value ? Math.round(Number(e.target.value) * 10) / 1000 : 0,
                })}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-right"
                placeholder="0.00"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
