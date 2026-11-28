'use client';

// TASK-B-361 (Issue #1367) — S5 청구서 상세.
// 작업 영역은 서버가 내려준 detail.scope === 'MINE'일 때만 렌더한다.
// RECEIVED/SUPERVISED(읽기 전용 경로)에서는 발행·취소·입금확인을 렌더하지 않는다.
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileWarning, Download } from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { StatementStatusBadge, StatementScopeBadge } from './Badges';
import { CancelConfirmModal, IssueConfirmModal, PaymentConfirmModal } from './StatementModals';
import type { StatementDetail as StatementDetailType } from './types';
import { formatKrw, formatPeriod, isIssuerScope } from './types';

export interface StatementDetailProps {
  detail: StatementDetailType | null;
  error?: string | null;
  basePath: string;
  locale: string;
}

export default function StatementDetail({ detail, error, basePath, locale }: StatementDetailProps) {
  const t = useTranslations('Statements');
  const tf = useTranslations('Finance'); // [설계 확정] 부가운임·조정 행 라벨(4로케일)
  const router = useRouter();
  const [current, setCurrent] = useState<StatementDetailType | null>(detail);
  const [issueOpen, setIssueOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const listHref = `/${locale}${basePath}`;

  if (!current) {
    return (
      <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <ZenCard className="space-y-3 text-center">
          <FileWarning size={32} className="mx-auto text-stone-400" />
          <p className="text-lg font-semibold">{t('notFound')}</p>
          {error && <p className="text-sm text-stone-500">{error}</p>}
          <Link href={listHref} className="text-blue-600 hover:underline text-sm">{t('view')}</Link>
        </ZenCard>
      </div>
    );
  }

  const mine = isIssuerScope(current.scope);
  const isDraft = current.status === 'DRAFT';
  const isIssued = current.status === 'ISSUED';

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('detailTitle')}</h1>
        <div className="flex items-center gap-4">
          {/* 읽기 전용 경로에서도 Excel 저장 허용 (설계 §6-6 · 이슈 결정사항) */}
          <a
            href={`/api/finance/statements/${current.id}/export`}
            download
            className="text-emerald-700 hover:underline inline-flex items-center gap-1 text-sm"
          >
            <Download size={14} />{t('excel')}
          </a>
          <Link href={listHref} className="text-blue-600 hover:underline text-sm">{t('view')}</Link>
        </div>
      </div>

      <ZenCard className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg">{current.statementNo}</span>
          <StatementStatusBadge status={current.status} />
          <StatementScopeBadge scope={current.scope} />
          {!mine && <ZenBadge variant="default">{t('readOnly')}</ZenBadge>}
        </div>
        <div className="text-sm text-stone-600 flex flex-wrap gap-x-6 gap-y-1">
          <span>{t('colBilledTarget')}: {current.billedName ?? '—'}</span>
          {current.billedPartyType === 'ADHOC' && current.billedBizNo && (
            <span>{t('billedBizNoLabel')}: {current.billedBizNo}</span>
          )}
          <span>{t('colPeriodRound')}: {formatPeriod(current.periodYear, current.periodMonth)} {current.roundNo}차</span>
          <span>{t('itemCount', { count: current.items.length })}</span>
        </div>
        <p className="text-lg font-semibold">{t('totalLabel', { amount: formatKrw(current.totalAmount) })}</p>
      </ZenCard>

      <ZenCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2 px-1">{t('colOrderNo')}</th>
              <th className="py-2 px-1">{t('colWeight')}</th>
              <th className="py-2 px-1">{t('colBaseFreight')}</th>
              <th className="py-2 px-1">{t('colFuelSurcharge')}</th>
              <th className="py-2 px-1">{t('colSurgeFee')}</th>
              <th className="py-2 px-1">{t('colOtherCharges')}</th>
              <th className="py-2 px-1">{t('colSubtotal')}</th>
            </tr>
          </thead>
          <tbody>
            {current.items.map((item) => (
              <React.Fragment key={item.orderId}>
                <tr className="border-b">
                  <td className="py-2 px-1 font-mono">{item.orderNo ?? '—'}</td>
                  <td className="py-2 px-1">{item.chargeWeightKg}</td>
                  <td className="py-2 px-1">{formatKrw(item.baseFreight)}</td>
                  <td className="py-2 px-1">{formatKrw(item.fuelSurcharge)}</td>
                  <td className="py-2 px-1">{formatKrw(item.surgeFee)}</td>
                  <td className="py-2 px-1">{formatKrw(item.otherCharges)}</td>
                  <td className="py-2 px-1">{formatKrw(item.lineTotal)}</td>
                </tr>
                {/* [설계 확정] 부가운임 항목(항목명·금액) + 조정 행 — 구성요소 합이 소계(line_total)와 정합 */}
                {(item.chargeDetails ?? []).map((cd, ci) => (
                  <tr key={`cd-${ci}`} className="text-slate-400">
                    <td className="py-1 px-1 pl-10" colSpan={6}>{tf('additionalCharge')} · {String(cd.name ?? '—')}</td>
                    <td className="py-1 px-1 text-right">{formatKrw(Number(cd.amount ?? 0))}</td>
                  </tr>
                ))}
                {(item.freightAdjustment ?? 0) !== 0 && (
                  <tr className="text-slate-400">
                    <td className="py-1 px-1 pl-10" colSpan={6}>{tf('freightAdjustment')}</td>
                    <td className="py-1 px-1 text-right">{formatKrw(item.freightAdjustment)}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td colSpan={6} className="py-2 px-1 text-right">{t('colSubtotal')}</td>
              <td className="py-2 px-1">{formatKrw(current.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </ZenCard>

      {/* 작업 영역: 서버 응답 scope가 MINE일 때만. 읽기 전용 경로는 완전히 미렌더. */}
      {mine && (
        <ZenCard className="flex flex-wrap gap-3">
          {isDraft && (
            <>
              <ZenButton onClick={() => setIssueOpen(true)}>{t('issue')}</ZenButton>
              <ZenButton variant="ghost" onClick={() => setCancelOpen(true)}>{t('issueCancel')}</ZenButton>
            </>
          )}
          {isIssued && (
            <ZenButton onClick={() => setPaymentOpen(true)}>{t('confirmPayment')}</ZenButton>
          )}
        </ZenCard>
      )}

      {mine && cancelOpen && (
        <CancelConfirmModal
          statementId={current.id}
          open
          onClose={() => setCancelOpen(false)}
          onSuccess={() => { setCancelOpen(false); router.push(listHref); }}
        />
      )}
      {mine && issueOpen && (
        <IssueConfirmModal
          statementId={current.id}
          open
          onClose={() => setIssueOpen(false)}
          onSuccess={() => { setIssueOpen(false); setCurrent((prev) => prev ? { ...prev, status: 'ISSUED' } : prev); }}
        />
      )}
      {mine && paymentOpen && (
        <PaymentConfirmModal
          statementId={current.id}
          totalAmount={current.totalAmount}
          open
          onClose={() => setPaymentOpen(false)}
          onSuccess={() => { setPaymentOpen(false); setCurrent((prev) => prev ? { ...prev, status: 'CLOSED' } : prev); }}
        />
      )}
    </div>
  );
}
