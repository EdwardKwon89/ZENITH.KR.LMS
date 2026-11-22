'use client';

// TASK-B-369 (Issue #1425) — S1 오더정산 목록.
// 조회·필터는 서버 액션(getOrdersForCostSettlement)이 수행하고, 화면은 응답값만 표시한다.
// 권한은 서버(assertAdmin)가 결정하며 클라이언트에서 역할을 계산하지 않는다.
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText, Search } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenSelect, ZenBadge } from '@/components/ui/ZenUI';
import { getOrdersForCostSettlement } from '@/app/actions/finance/ups-actual-cost';
import type { CostSettlementStatus, OrderSettlementFilter, OrderSettlementRow } from './types';
import { formatKstDate } from './types';

export interface OrderSettlementListProps {
  initialOrders: OrderSettlementRow[];
  initialFilter: OrderSettlementFilter;
  locale: string;
  initialError?: string | null;
}

const STATUS_VALUES: Array<CostSettlementStatus | 'ALL'> = ['NOT_SETTLED', 'SETTLED', 'ALL'];

export default function OrderSettlementList({
  initialOrders,
  initialFilter,
  locale,
  initialError = null,
}: OrderSettlementListProps) {
  const t = useTranslations('OrderSettlement');
  const [rows, setRows] = useState<OrderSettlementRow[]>(initialOrders);
  const [status, setStatus] = useState<CostSettlementStatus | 'ALL'>(initialFilter.status);
  const [from, setFrom] = useState(initialFilter.from);
  const [to, setTo] = useState(initialFilter.to);
  const [q, setQ] = useState(initialFilter.q ?? '');
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const unsettledCount = useMemo(
    () => rows.filter((row) => row.settlementStatus === 'NOT_SETTLED' && !row.legacyInvoiced).length,
    [rows],
  );

  const detailHref = (orderId: string) => `/${locale}/finance/order-settlement/${orderId}`;

  const lookup = async () => {
    if (!from || !to) {
      setError(t('dateRequired'));
      return;
    }
    if (from > to) {
      setError(t('dateRangeInvalid'));
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getOrdersForCostSettlement({ status, from, to, q: q.trim() || undefined });
    setLoading(false);
    if (!res.success) {
      // 실패를 빈 목록 성공으로 위장하지 않는다 — 이전 결과는 유지하고 오류만 표시.
      setError(res.error ?? t('actionFailed'));
      return;
    }
    setRows(res.orders ?? []);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <ZenBadge variant={unsettledCount > 0 ? 'warning' : 'success'}>
          {t('unsettledBadge', { count: unsettledCount })}
        </ZenBadge>
      </div>

      <ZenCard className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterDeliveredFrom')}</span>
            <ZenInput aria-label={t('filterDeliveredFrom')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterDeliveredTo')}</span>
            <ZenInput aria-label={t('filterDeliveredTo')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterStatus')}</span>
            <ZenSelect
              value={status}
              onValueChange={(value) => setStatus(value as CostSettlementStatus | 'ALL')}
              options={STATUS_VALUES.map((value) => ({
                value,
                label: value === 'ALL' ? t('statusAll') : value === 'NOT_SETTLED' ? t('statusNotSettled') : t('statusSettled'),
              }))}
            />
          </label>
          <div className="text-sm md:col-span-2">
            <label className="block">
              <span className="block mb-1 text-stone-500">{t('searchLabel')}</span>
              <ZenInput
                aria-label={t('searchLabel')}
                placeholder={t('searchPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <div className="mt-2">
              <ZenButton onClick={lookup} loading={loading} type="button">
                <Search size={16} />
                {t('search')}
              </ZenButton>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
      </ZenCard>

      <ZenCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2 px-1">{t('colOrderNo')}</th>
              <th className="py-2 px-1">{t('colShipperAgency')}</th>
              <th className="py-2 px-1">{t('colDeliveredAt')}</th>
              <th className="py-2 px-1">{t('colUpsInvoice')}</th>
              <th className="py-2 px-1">{t('colSettlementStatus')}</th>
              <th className="py-2 px-1">{t('colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-stone-400">{t('empty')}</td>
              </tr>
            )}
            {rows.map((row) => {
              const settled = row.settlementStatus === 'SETTLED';
              return (
                <tr key={row.orderId} className="border-b last:border-0">
                  <td className="py-2 px-1 font-mono">{row.orderNo}</td>
                  <td className="py-2 px-1">
                    <span>{row.shipperName ?? '—'}</span>
                    <span className="text-stone-400"> / {row.agencyName ?? '—'}</span>
                  </td>
                  <td className="py-2 px-1">{formatKstDate(row.deliveredAt)}</td>
                  <td className="py-2 px-1">
                    {row.upsInvoiceNo
                      ? <span className="font-mono">{row.upsInvoiceNo}</span>
                      : row.hasActualCost ? t('invoiceEntered') : t('invoiceMissing')}
                  </td>
                  <td className="py-2 px-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <ZenBadge variant={settled ? 'success' : 'warning'}>
                        {settled ? t('statusSettled') : t('statusNotSettled')}
                      </ZenBadge>
                      {row.legacyInvoiced && <ZenBadge variant="danger">{t('legacyInvoiced')}</ZenBadge>}
                    </div>
                    {settled && row.costSettledAt && (
                      <span className="block text-xs text-stone-400">{formatKstDate(row.costSettledAt)}</span>
                    )}
                  </td>
                  <td className="py-2 px-1">
                    <Link href={detailHref(row.orderId)} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      <FileText size={14} />
                      {settled || row.legacyInvoiced ? t('actionView') : t('actionSettle')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ZenCard>
    </div>
  );
}
