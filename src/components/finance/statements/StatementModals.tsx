'use client';

// TASK-B-361 (Issue #1367) — S5 발행/입금확인 확인 모달.
// 이 모달들은 scope === MINE(서버 응답)일 때만 렌더된다.
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { issueBillingStatement, confirmStatementPayment } from '@/app/actions/finance/billing-statements';
import { getKstToday } from '@/lib/utils/date-kst';
import { formatKrw } from './types';

interface ModalProps {
  statementId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IssueConfirmModal({ statementId, open, onClose, onSuccess }: ModalProps) {
  const t = useTranslations('Statements');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const confirm = async () => {
    setLoading(true);
    setError(null);
    const res = await issueBillingStatement(statementId);
    setLoading(false);
    if (!res.success) {
      // 액션 error는 이미 번역된 사용자 문구 — 그대로 표시
      setError(res.error ?? t('actionFailed'));
      return;
    }
    toast.success(t('issue'));
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="zen-glass rounded-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">{t('issue')}</h3>
        <p className="text-sm text-stone-700">{t('issueWarning')}</p>
        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <ZenButton variant="ghost" onClick={onClose} disabled={loading}>{t('close')}</ZenButton>
          <ZenButton onClick={confirm} loading={loading}>{t('issueConfirm')}</ZenButton>
        </div>
      </div>
    </div>
  );
}

interface PaymentModalProps extends ModalProps {
  totalAmount: number;
}

export function PaymentConfirmModal({ statementId, totalAmount, open, onClose, onSuccess }: PaymentModalProps) {
  const t = useTranslations('Statements');
  const [paidAt, setPaidAt] = useState(() => getKstToday());
  const [amount, setAmount] = useState(() => String(totalAmount));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const confirm = async () => {
    const numeric = Number(amount);
    // 클라이언트 사전 경고 — 최종 검증은 서버액션(전액만 허용)이 수행한다.
    if (!Number.isFinite(numeric) || numeric !== Number(totalAmount)) {
      setError(t('paymentMismatch'));
      return;
    }
    setLoading(true);
    setError(null);
    const res = await confirmStatementPayment(statementId, { paidAt, amount: numeric });
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? t('actionFailed'));
      return;
    }
    toast.success(t('paymentConfirm'));
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="zen-glass rounded-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">{t('paymentTitle')}</h3>
        <p className="text-sm text-stone-600">{t('totalLabel', { amount: formatKrw(totalAmount) })}</p>
        <label className="block text-sm">
          {t('paymentPaidAt')}
          <ZenInput aria-label={t('paymentPaidAt')} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </label>
        <label className="block text-sm">
          {t('paymentAmount')}
          <ZenInput aria-label={t('paymentAmount')} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <ZenButton variant="ghost" onClick={onClose} disabled={loading}>{t('close')}</ZenButton>
          <ZenButton onClick={confirm} loading={loading}>{t('paymentConfirm')}</ZenButton>
        </div>
      </div>
    </div>
  );
}
