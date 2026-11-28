'use client';

// TASK-B-361 (Issue #1367) — S3 청구서 목록.
// 3개 경로(/finance, /agency, /shipper)가 이 컴포넌트를 재사용한다.
// scope·status는 서버 액션 응답값만 사용하며 클라이언트에서 권한을 계산하지 않는다.
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FileText, Plus, Download } from 'lucide-react';
import { ZenCard, ZenButton, ZenSelect } from '@/components/ui/ZenUI';
import { StatementStatusBadge, StatementScopeBadge } from './Badges';
import { CancelConfirmModal, PaymentConfirmModal } from './StatementModals';
import type { StatementListRow, StatementScope } from './types';
import { formatKrw, formatPeriod } from './types';

export interface StatementsListProps {
  statements: StatementListRow[];
  basePath: string;
  canCreate: boolean;
  locale: string;
  loadError?: string | null;
}

const SCOPES: StatementScope[] = ['MINE', 'RECEIVED', 'SUPERVISED'];
const STATUSES = ['DRAFT', 'ISSUED', 'CLOSED'];

export default function StatementsList({ statements, basePath, canCreate, locale, loadError }: StatementsListProps) {
  const t = useTranslations('Statements');
  const [rows, setRows] = useState<StatementListRow[]>(statements);
  const [scope, setScope] = useState<string>('ALL');
  const [target, setTarget] = useState<string>('ALL');
  const [year, setYear] = useState<string>('ALL');
  const [month, setMonth] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [cancelRow, setCancelRow] = useState<StatementListRow | null>(null);
  const [paymentRow, setPaymentRow] = useState<StatementListRow | null>(null);

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.periodYear))).sort((a, b) => b - a), [rows]);
  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.periodMonth))).sort((a, b) => a - b), [rows]);
  const targets = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.billedOrgId ?? r.billedName ?? '', r.billedName ?? ''));
    return Array.from(map.entries());
  }, [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (scope !== 'ALL' && r.scope !== scope) return false;
    if (target !== 'ALL' && (r.billedOrgId ?? r.billedName ?? '') !== target) return false;
    if (year !== 'ALL' && r.periodYear !== Number(year)) return false;
    if (month !== 'ALL' && r.periodMonth !== Number(month)) return false;
    if (status !== 'ALL' && r.status !== status) return false;
    return true;
  }), [rows, scope, target, year, month, status]);

  const detailHref = (id: string) => `/${locale}${basePath}/${id}`;

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canCreate && (
          <Link href={`/${locale}${basePath}/new`}>
            <ZenButton><Plus size={16} />{t('createButton')}</ZenButton>
          </Link>
        )}
      </div>

      <ZenCard className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterScope')}</span>
            <ZenSelect
              value={scope}
              onValueChange={setScope}
              placeholder={t('scopeAll')}
              options={[
                { value: 'ALL', label: t('scopeAll') },
                ...SCOPES.map((s) => ({ value: s, label: t(s === 'MINE' ? 'scopeMine' : s === 'RECEIVED' ? 'scopeReceived' : 'scopeSupervised') })),
              ]}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterTarget')}</span>
            <ZenSelect
              value={target}
              onValueChange={setTarget}
              placeholder={t('scopeAll')}
              options={[{ value: 'ALL', label: t('scopeAll') }, ...targets.map(([value, label]) => ({ value, label: label || value }))]}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterYear')}</span>
            <ZenSelect
              value={year}
              onValueChange={setYear}
              placeholder={t('scopeAll')}
              options={[{ value: 'ALL', label: t('scopeAll') }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterMonth')}</span>
            <ZenSelect
              value={month}
              onValueChange={setMonth}
              placeholder={t('scopeAll')}
              options={[{ value: 'ALL', label: t('scopeAll') }, ...months.map((m) => ({ value: String(m), label: String(m) }))]}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('filterStatus')}</span>
            <ZenSelect
              value={status}
              onValueChange={setStatus}
              placeholder={t('statusAll')}
              options={[{ value: 'ALL', label: t('statusAll') }, ...STATUSES.map((s) => ({ value: s, label: t(s === 'DRAFT' ? 'statusDraft' : s === 'ISSUED' ? 'statusIssued' : 'statusClosed') }))]}
            />
          </label>
        </div>
        <p className="text-xs text-stone-500">{t('onlyMineNote')}</p>
        {loadError && <p className="text-sm text-rose-600" role="alert">{loadError}</p>}
      </ZenCard>

      <ZenCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2 px-1">{t('colStatementNo')}</th>
              <th className="py-2 px-1">{t('colBilledTarget')}</th>
              <th className="py-2 px-1">{t('colPeriodRound')}</th>
              <th className="py-2 px-1">{t('colAmount')}</th>
              <th className="py-2 px-1">{t('colStatus')}</th>
              <th className="py-2 px-1">{t('filterScope')}</th>
              <th className="py-2 px-1">{t('colAction')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-stone-400">—</td></tr>
            )}
            {filtered.map((row) => {
              const mine = row.scope === 'MINE';
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 px-1 font-mono">{row.statementNo}</td>
                  <td className="py-2 px-1">{row.billedName ?? '—'}</td>
                  <td className="py-2 px-1">{formatPeriod(row.periodYear, row.periodMonth)} {row.roundNo}차</td>
                  <td className="py-2 px-1">{formatKrw(row.totalAmount)}원</td>
                  <td className="py-2 px-1"><StatementStatusBadge status={row.status} /></td>
                  <td className="py-2 px-1"><StatementScopeBadge scope={row.scope} /></td>
                  <td className="py-2 px-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Link href={detailHref(row.id)} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <FileText size={14} />{t('view')}
                      </Link>
                      {/* 읽기 전용 경로에서도 Excel 저장 허용 (설계 §6-4 · 이슈 결정사항) */}
                      <a
                        href={`/api/finance/statements/${row.id}/export`}
                        download
                        className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Download size={14} />{t('excel')}
                      </a>
                      {/* 읽기 전용 경로(RECEIVED/SUPERVISED)에서는 변형 버튼을 렌더하지 않는다 */}
                      {mine && row.status === 'DRAFT' && (
                        <button type="button" className="text-rose-600 hover:underline" onClick={() => setCancelRow(row)}>
                          {t('cancel')}
                        </button>
                      )}
                      {mine && row.status === 'ISSUED' && (
                        <button type="button" className="text-emerald-600 hover:underline" onClick={() => setPaymentRow(row)}>
                          {t('confirmPayment')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ZenCard>

      {cancelRow && (
        <CancelConfirmModal
          statementId={cancelRow.id}
          open
          onClose={() => setCancelRow(null)}
          onSuccess={() => {
            setRows((prev) => prev.filter((r) => r.id !== cancelRow.id));
            setCancelRow(null);
          }}
        />
      )}

      {paymentRow && (
        <PaymentConfirmModal
          statementId={paymentRow.id}
          totalAmount={paymentRow.totalAmount}
          open
          onClose={() => setPaymentRow(null)}
          onSuccess={() => {
            setRows((prev) => prev.map((r) => r.id === paymentRow.id ? { ...r, status: 'CLOSED' } : r));
            setPaymentRow(null);
          }}
        />
      )}
    </div>
  );
}
