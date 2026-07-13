'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Save } from 'lucide-react';
import { getShipperZoneDiscounts, upsertShipperZoneDiscounts } from '@/app/actions/agency/zone-discounts';
import { createPricingSchedule, getScheduledPricingChanges, cancelPricingSchedule, getPricingAuditLog } from '@/app/actions/ups/pricing-schedule';
import type { UpsZoneWithCountries } from '@/types/ups';

interface ZoneDiscountFormProps {
  shipperOrgId: string;
  shipperType: string;
  zones: UpsZoneWithCountries[];
  agencyOrgId?: string;
}

export function ZoneDiscountForm({ shipperOrgId, shipperType, zones, agencyOrgId }: ZoneDiscountFormProps) {
  const t = useTranslations('AgencyShippers');
  const [zoneRates, setZoneRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [scheduledChanges, setScheduledChanges] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    async function load() {
      try {
        const data = await getShipperZoneDiscounts(shipperOrgId);
        const map: Record<string, number> = {};
        for (const d of data) map[d.zone_id] = Number(d.discount_rate);
        setZoneRates(map);
        const scheduled = await getScheduledPricingChanges('SHIPPER_DISCOUNT');
        setScheduledChanges(scheduled.filter((s: any) => s.target_ref?.shipper_org_id === shipperOrgId));
        const logs = await getPricingAuditLog('SHIPPER_DISCOUNT');
        setAuditLog(logs.filter((l: any) => l.target_ref?.shipper_org_id === shipperOrgId));
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
      if (!validFrom) {
        setError('적용일자를 입력해주세요.');
        return;
      }
      if (!agencyOrgId) {
        setError('대리점 정보를 찾을 수 없습니다.');
        return;
      }
      for (const [zoneId, rate] of Object.entries(zoneRates)) {
        await createPricingSchedule({
          setting_type: 'SHIPPER_DISCOUNT',
          target_ref: { agency_org_id: agencyOrgId, shipper_org_id: shipperOrgId, zone_id: zoneId },
          new_value: rate,
          valid_from: validFrom,
          valid_until: validUntil || null,
        });
      }
      setValidFrom('');
      setValidUntil('');
      const scheduled = await getScheduledPricingChanges('SHIPPER_DISCOUNT');
      setScheduledChanges(scheduled.filter((s: any) => s.target_ref?.shipper_org_id === shipperOrgId));
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

        <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-700 uppercase">적용일자</label>
            <input type="date" value={validFrom} min={minDate}
              onChange={e => setValidFrom(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-700 uppercase">종료일자</label>
            <input type="date" value={validUntil} min={validFrom || minDate}
              onChange={e => setValidUntil(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-sm" />
          </div>
        </div>
        <p className="text-[10px] text-blue-600">* 적용일자는 필수입니다. 예약 등록 후 매일 자정 배치로 적용됩니다.</p>

        {scheduledChanges.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 mb-2 uppercase">예정된 변경 ({scheduledChanges.length}건)</h4>
            <div className="space-y-2">
              {scheduledChanges.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-amber-100">
                  <div>
                    <span className="font-mono">{s.valid_from} ~ {s.valid_until || '무기한'}</span>
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="font-mono font-bold">{(s.new_value * 100).toFixed(1)}%</span>
                  </div>
                  <button onClick={async () => { if (confirm('이 예약을 취소하시겠습니까?')) { await cancelPricingSchedule(s.id); const scheduled = await getScheduledPricingChanges('SHIPPER_DISCOUNT'); setScheduledChanges(scheduled.filter((sc: any) => sc.target_ref?.shipper_org_id === shipperOrgId)); } }} className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded hover:bg-red-100">취소</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {auditLog.length > 0 && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowAuditLog(!showAuditLog)} className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1">
              {showAuditLog ? '▾' : '▸'} 변경 이력 ({auditLog.length}건)
            </button>
            {showAuditLog && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {auditLog.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-[10px] p-1.5 bg-white rounded border border-slate-100">
                      <div>
                        <span className={`font-bold ${log.action === 'CREATE' ? 'text-green-600' : log.action === 'UPDATE' ? 'text-blue-600' : log.action === 'CANCEL' ? 'text-red-600' : log.action === 'APPLY' ? 'text-purple-600' : 'text-orange-600'}`}>{log.action}</span>
                        <span className="text-slate-400 mx-1">|</span>
                        {log.old_data?.discount_rate != null && <span className="text-slate-500">{(log.old_data.discount_rate * 100).toFixed(1)}%</span>}
                        {log.new_data?.new_value != null && <span className="text-slate-700 font-bold"> → {(log.new_data.new_value * 100).toFixed(1)}%</span>}
                      </div>
                      <span className="text-slate-400">{new Date(log.changed_at).toLocaleString('ko-KR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
