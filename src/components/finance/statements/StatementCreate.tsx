'use client';

// TASK-B-361 (Issue #1367) — S4 청구서 생성(2단계: 대상·기간 → 후보 오더 선택).
// 수기 화주(ADHOC)는 대리점 전용 — allowAdhoc은 서버가 역할로 계산해 내려준다.
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ZenCard, ZenButton, ZenInput, ZenSelect, ZenBadge } from '@/components/ui/ZenUI';
import {
  listBillableOrders,
  listAdhocShipperNames,
  createBillingStatement,
  type BillableTarget,
  type DateBasis,
} from '@/app/actions/finance/billing-statements';
import type { AdhocShipperName, BillableOrderRow, StatementTarget } from './types';
import { formatKrw } from './types';
// TASK-B-368 / DEF-B-162 (Issue #1415) — 서버·RPC와 규칙 단일 출처 (로컬 normalize() 제거)
import { normalizeShipperName } from '@/lib/finance/billing/normalize-shipper-name';

export interface StatementCreateProps {
  basePath: string;
  locale: string;
  targets: StatementTarget[];
  allowAdhoc: boolean;
  /** Admin(원가 정산 가능) 여부 — 서버 역할로 계산해 내려준다. */
  canSettleOrders: boolean;
  defaultYear: number;
  defaultMonth: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Jaison 리뷰(2026-11-22): 조회 후 조건이 바뀌면 이전 후보/선택을 숨기고 저장을 막는다.
// 조건 10종을 스냅샷으로 비교해 새 필드가 추가되어도 누락 없이 무효화되게 한다.
interface LookupConditions {
  mode: 'ORG' | 'ADHOC';
  orgId: string;
  shipperName: string;
  bizNo: string;
  year: string;
  month: string;
  dateBasis: DateBasis;
  dateFrom: string;
  dateTo: string;
}

const sameConditions = (a: LookupConditions, b: LookupConditions): boolean =>
  a.mode === b.mode && a.orgId === b.orgId && a.shipperName === b.shipperName &&
  a.bizNo === b.bizNo && a.year === b.year && a.month === b.month &&
  a.dateBasis === b.dateBasis && a.dateFrom === b.dateFrom && a.dateTo === b.dateTo;

export default function StatementCreate({ basePath, locale, targets, allowAdhoc, canSettleOrders, defaultYear, defaultMonth }: StatementCreateProps) {
  const t = useTranslations('Statements');
  const router = useRouter();

  const [mode, setMode] = useState<'ORG' | 'ADHOC'>('ORG');
  const [orgId, setOrgId] = useState('');
  const [shipperName, setShipperName] = useState('');
  const [bizNo, setBizNo] = useState('');
  const [suggestions, setSuggestions] = useState<AdhocShipperName[]>([]);
  const [year, setYear] = useState(String(defaultYear));
  const [month, setMonth] = useState(String(defaultMonth));
  const [dateBasis, setDateBasis] = useState<DateBasis>('DELIVERED');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [orders, setOrders] = useState<BillableOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [excludedUnsettled, setExcludedUnsettled] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 마지막 성공 조회의 조건 스냅샷 — null이면 아직 유효한 조회 결과가 없다.
  const [lookupConditions, setLookupConditions] = useState<LookupConditions | null>(null);

  const conditions: LookupConditions = { mode, orgId, shipperName, bizNo, year, month, dateBasis, dateFrom, dateTo };
  const isStale = lookupConditions !== null && !sameConditions(lookupConditions, conditions);
  const showLookupNotices = lookupConditions !== null && !isStale;

  // 수기 화주 자동완성 — 과거 오더의 정규화된 수기 화주명 그룹.
  useEffect(() => {
    let active = true;
    if (mode !== 'ADHOC' || !allowAdhoc || shipperName.trim().length === 0) return;
    const timer = setTimeout(async () => {
      const res = await listAdhocShipperNames(shipperName.trim());
      if (active && res.success) setSuggestions(res.names ?? []);
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [mode, allowAdhoc, shipperName]);

  const similar = useMemo(
    () => suggestions.filter((s) => s.normalized !== normalizeShipperName(shipperName)),
    [suggestions, shipperName],
  );

  const billedTarget = (): BillableTarget | null => {
    if (mode === 'ORG') return orgId ? { type: 'ORG', orgId } : null;
    const name = shipperName.trim();
    if (!name) return null;
    return bizNo.trim() ? { type: 'ADHOC', shipperName: name, bizNo: bizNo.trim() } : { type: 'ADHOC', shipperName: name };
  };

  const validateDates = (): boolean => {
    if (!dateFrom || !dateTo || !ISO_DATE.test(dateFrom) || !ISO_DATE.test(dateTo)) {
      setError(t('dateRequired'));
      return false;
    }
    if (dateFrom > dateTo) {
      setError(t('dateRangeInvalid'));
      return false;
    }
    return true;
  };

  const lookup = async () => {
    setError(null);
    const target = billedTarget();
    if (!target) { setError(t('targetRequired')); return; }
    if (!validateDates()) return;

    setLoading(true);
    // 이전 조회 잔존물 제거 — 실패 시에도 이전 총건수·미정산·상한 경고가 남지 않는다.
    setLookupConditions(null);
    setOrders([]);
    setSelectedIds([]);
    setTotal(0);
    setExcludedUnsettled(0);
    setTruncated(false);
    const res = await listBillableOrders({ billedTarget: target, dateBasis, dateFrom, dateTo });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? t('actionFailed'));
      return;
    }
    setOrders(res.orders ?? []);
    setTotal(res.total ?? 0);
    setExcludedUnsettled(res.excludedUnsettled ?? 0);
    setTruncated(Boolean(res.truncated));
    setSelectedIds([]);
    setLookupConditions(conditions);
  };

  const selectedTotal = orders
    .filter((o) => selectedIds.includes(o.orderId))
    .reduce((sum, o) => sum + o.lineTotal, 0);

  const toggleAll = () => setSelectedIds(selectedIds.length === orders.length ? [] : orders.map((o) => o.orderId));
  const toggle = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async () => {
    setError(null);
    if (isStale) { setError(t('conditionsChanged')); return; }
    const target = billedTarget();
    if (!target) { setError(t('targetRequired')); return; }
    if (selectedIds.length === 0) { setError(t('noCandidates')); return; }

    setLoading(true);
    const res = await createBillingStatement({
      billedTarget: target,
      year: Number(year),
      month: Number(month),
      orderIds: selectedIds,
      periodFrom: dateFrom || null,
      periodTo: dateTo || null,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? t('actionFailed'));
      return;
    }
    toast.success(`${res.statementNo} · ${res.roundNo}차`);
    router.push(`/${locale}${basePath}/${res.statementId}`);
  };

  const basisLabel = dateBasis === 'RELEASED' ? t('colBasisDateReleased') : t('colBasisDateDelivered');

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <h1 className="text-2xl font-bold">{t('newTitle')}</h1>

      <ZenCard className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('targetMode')}</span>
            <ZenSelect
              value={mode}
              onValueChange={(v) => { setMode(v as 'ORG' | 'ADHOC'); setError(null); setSuggestions([]); }}
              placeholder={t('targetMode')}
              options={[
                { value: 'ORG', label: t('targetOrg') },
                ...(allowAdhoc ? [{ value: 'ADHOC', label: t('targetAdhoc') }] : []),
              ]}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('target')}</span>
            {mode === 'ORG' ? (
              <ZenSelect
                value={orgId}
                onValueChange={setOrgId}
                placeholder={t('target')}
                options={targets.map((x) => ({ value: x.id, label: x.name }))}
              />
            ) : (
              <ZenInput
                aria-label={t('shipperName')}
                value={shipperName}
                onChange={(e) => { setShipperName(e.target.value); setSuggestions([]); }}
                placeholder={t('shipperName')}
              />
            )}
          </label>
        </div>

        {mode === 'ADHOC' && (
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="block mb-1 text-stone-500">{t('bizNo')}</span>
              <ZenInput value={bizNo} onChange={(e) => setBizNo(e.target.value)} placeholder={t('bizNo')} />
            </label>
            {similar.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3">
                <ZenBadge variant="warning">{t('similarNames', { count: similar.length })}</ZenBadge>
                {similar.map((s) => (
                  <button key={s.normalized} type="button" className="text-amber-800 underline text-sm" onClick={() => setShipperName(s.name)}>
                    {s.name} ({s.billableCount})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterYear')}</span>
            <ZenInput type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterMonth')}</span>
            <ZenInput type="number" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('dateBasis')}</span>
            <ZenSelect
              value={dateBasis}
              onValueChange={(v) => setDateBasis(v as DateBasis)}
              placeholder={t('dateBasis')}
              options={[{ value: 'DELIVERED', label: t('colBasisDateDelivered') }, { value: 'RELEASED', label: t('colBasisDateReleased') }]}
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label><span className="block mb-1 text-stone-500">{t('dateFrom')}</span><ZenInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label><span className="block mb-1 text-stone-500">{t('dateTo')}</span><ZenInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ZenButton onClick={lookup} loading={loading}>{t('lookupOrders')}</ZenButton>
        </div>

        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
      </ZenCard>

      {isStale && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800" role="status">{t('conditionsChanged')}</div>
      )}
      {showLookupNotices && excludedUnsettled > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <span>{canSettleOrders
            ? (
              <>
                {t('excludedUnsettledAdmin', { count: excludedUnsettled })}{' '}
                <Link href={`/${locale}/finance/order-settlement`} className="font-semibold underline">
                  {t('goOrderSettlement')}
                </Link>
              </>
            )
            : t('excludedUnsettledAgency', { count: excludedUnsettled })}</span>
        </div>
      )}
      {showLookupNotices && truncated && (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{t('truncatedWarning')}</div>
      )}

      {showLookupNotices && orders.length > 0 && (
        <ZenCard className="overflow-x-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={selectedIds.length === orders.length} onChange={toggleAll} />
                {t('selectAll')}
              </label>
              <span>{t('selectedCount', { count: selectedIds.length, total: total || orders.length })}</span>
            </div>
            <span className="font-semibold">{t('selectedTotal', { amount: formatKrw(selectedTotal) })}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="py-2 px-1">{t('selectAll')}</th>
                <th className="py-2 px-1">{t('colOrderNo')}</th>
                <th className="py-2 px-1">{t('colShipperName')}</th>
                <th className="py-2 px-1">{basisLabel}</th>
                <th className="py-2 px-1">{t('colWeight')}</th>
                <th className="py-2 px-1">{t('colBaseFreight')}</th>
                <th className="py-2 px-1">{t('colFuelSurcharge')}</th>
                <th className="py-2 px-1">{t('colSurgeFee')}</th>
                <th className="py-2 px-1">{t('colOtherCharges')}</th>
                <th className="py-2 px-1">{t('colLineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} className="border-b last:border-0">
                  <td className="py-2 px-1"><input type="checkbox" checked={selectedIds.includes(o.orderId)} onChange={() => toggle(o.orderId)} /></td>
                  <td className="py-2 px-1 font-mono">{o.orderNo}</td>
                  <td className="py-2 px-1">{o.shipperName ?? '—'}</td>
                  <td className="py-2 px-1">{o.basisDate ?? '—'}</td>
                  <td className="py-2 px-1">{o.chargeWeightKg}</td>
                  <td className="py-2 px-1">{formatKrw(o.baseFreight)}</td>
                  <td className="py-2 px-1">{formatKrw(o.fuelSurcharge)}</td>
                  <td className="py-2 px-1">{formatKrw(o.surgeFee)}</td>
                  <td className="py-2 px-1">{formatKrw(o.otherCharges)}</td>
                  <td className="py-2 px-1">{formatKrw(o.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2">
            <Link href={`/${locale}${basePath}`}><ZenButton variant="ghost">{t('cancel')}</ZenButton></Link>
            <ZenButton onClick={save} loading={loading}>{t('saveDraft')}</ZenButton>
          </div>
        </ZenCard>
      )}
    </div>
  );
}
