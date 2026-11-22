'use client';

// TASK-B-369 (Issue #1425) — S2 오더정산 상세.
// 원가 미리보기·저장·정산 완료·되돌리기는 모두 서버 액션이 수행하며,
// 화면은 서버 응답의 금액/상태만 표시한다(클라이언트 금액 재계산 금지).
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, Lock, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenTextarea, ZenBadge } from '@/components/ui/ZenUI';
import {
  previewUpsActualCost,
  recordUpsActualCost,
  markOrderCostSettled,
  unmarkOrderCostSettled,
  type UpsActualCostInput,
} from '@/app/actions/finance/ups-actual-cost';
import type { CostSettlementStatus, OrderSettlementDetailData, SavedActualCost } from './types';
import { formatDecimal, formatKrw, formatKstDate, toNumberOrNull } from './types';

export interface OrderSettlementDetailProps {
  detail: OrderSettlementDetailData;
  locale: string;
}

type ConfirmKind = 'settle' | 'unmark' | null;

interface PreviewState {
  totalCostKrw: number | null;
  appliedExchangeRate: number | null;
  recalc: {
    weightOrDimsChanged: boolean;
    newAgencyTotal: number;
    newShipperTotal: number;
  } | null;
}

const EMPTY_PREVIEW: PreviewState = { totalCostKrw: null, appliedExchangeRate: null, recalc: null };

interface FormState {
  invoiceNo: string;
  invoiceDate: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  baseFreight: string;
  fuelSurcharge: string;
  surgeFee: string;
  otherCharges: string;
  notes: string;
}

/** 저장값 프리필 — KRW 기준 행은 HKD 입력으로 변환하지 않는다(통화 혼입 방지). */
function buildFormState(saved: SavedActualCost | null): FormState {
  const hkd = saved && !saved.krwBased ? saved : null;
  return {
    invoiceNo: saved?.upsInvoiceNo ?? '',
    invoiceDate: saved?.upsInvoiceDate ?? '',
    weightKg: saved?.actualWeightKg != null ? String(saved.actualWeightKg) : '',
    lengthCm: saved?.actualLengthCm != null ? String(saved.actualLengthCm) : '',
    widthCm: saved?.actualWidthCm != null ? String(saved.actualWidthCm) : '',
    heightCm: saved?.actualHeightCm != null ? String(saved.actualHeightCm) : '',
    baseFreight: hkd?.baseFreightHkd != null ? String(hkd.baseFreightHkd) : '',
    fuelSurcharge: hkd?.fuelSurchargeHkd != null ? String(hkd.fuelSurchargeHkd) : '',
    surgeFee: hkd?.surgeFeeHkd != null ? String(hkd.surgeFeeHkd) : '',
    otherCharges: hkd?.otherChargesHkd != null ? String(hkd.otherChargesHkd) : '',
    notes: saved?.notes ?? '',
  };
}

export default function OrderSettlementDetail({ detail, locale }: OrderSettlementDetailProps) {
  const t = useTranslations('OrderSettlement');
  const router = useRouter();

  const saved = detail.savedCost;
  const [status, setStatus] = useState<CostSettlementStatus>(detail.settlementStatus);
  const settled = status === 'SETTLED';

  // 기존 저장값 프리필 — KRW 기준 행은 HKD 입력으로 변환하지 않는다(통화 혼입 방지).
  const initialForm = buildFormState(saved);
  const [invoiceNo, setInvoiceNo] = useState(initialForm.invoiceNo);
  const [invoiceDate, setInvoiceDate] = useState(initialForm.invoiceDate);
  const [weightKg, setWeightKg] = useState(initialForm.weightKg);
  const [lengthCm, setLengthCm] = useState(initialForm.lengthCm);
  const [widthCm, setWidthCm] = useState(initialForm.widthCm);
  const [heightCm, setHeightCm] = useState(initialForm.heightCm);
  const [baseFreight, setBaseFreight] = useState(initialForm.baseFreight);
  const [fuelSurcharge, setFuelSurcharge] = useState(initialForm.fuelSurcharge);
  const [surgeFee, setSurgeFee] = useState(initialForm.surgeFee);
  const [otherCharges, setOtherCharges] = useState(initialForm.otherCharges);
  const [notes, setNotes] = useState(initialForm.notes);

  const [preview, setPreview] = useState<PreviewState>(EMPTY_PREVIEW);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [hasSaved, setHasSaved] = useState(saved != null);
  // 저장 성공 시점의 입력 스냅샷 — 현재 입력과 다르면 정산 완료를 막는다(미저장 값 확정 방지).
  const [savedFormKey, setSavedFormKey] = useState<string | null>(() => (saved ? JSON.stringify(initialForm) : null));

  const formState: FormState = {
    invoiceNo, invoiceDate, weightKg, lengthCm, widthCm, heightCm,
    baseFreight, fuelSurcharge, surgeFee, otherCharges, notes,
  };
  const formKey = JSON.stringify(formState);
  const isDirty = hasSaved && savedFormKey !== null && formKey !== savedFormKey;

  const hasAnyInput = useMemo(
    () => [weightKg, lengthCm, widthCm, heightCm, baseFreight, fuelSurcharge, surgeFee, otherCharges]
      .some((value) => value.trim() !== ''),
    [weightKg, lengthCm, widthCm, heightCm, baseFreight, fuelSurcharge, surgeFee, otherCharges],
  );

  const buildInput = (): UpsActualCostInput => {
    const input: UpsActualCostInput = {};
    const weight = toNumberOrNull(weightKg);
    const length = toNumberOrNull(lengthCm);
    const width = toNumberOrNull(widthCm);
    const height = toNumberOrNull(heightCm);
    const base = toNumberOrNull(baseFreight);
    const fuel = toNumberOrNull(fuelSurcharge);
    const surge = toNumberOrNull(surgeFee);
    const other = toNumberOrNull(otherCharges);
    if (invoiceNo.trim()) input.upsInvoiceNo = invoiceNo.trim();
    if (invoiceDate) input.upsInvoiceDate = invoiceDate;
    if (weight != null) input.actualWeightKg = weight;
    if (length != null) input.actualLengthCm = length;
    if (width != null) input.actualWidthCm = width;
    if (height != null) input.actualHeightCm = height;
    if (base != null) input.baseFreightHkd = base;
    if (fuel != null) input.fuelSurchargeHkd = fuel;
    if (surge != null) input.surgeFeeHkd = surge;
    if (other != null) input.otherChargesHkd = other;
    if (notes.trim()) input.notes = notes.trim();
    return input;
  };

  // 미리보기 300ms 디바운스 — 입력이 바뀔 때마다 서버를 호출하지 않는다.
  useEffect(() => {
    if (settled || !hasAnyInput) {
      setPreview(EMPTY_PREVIEW);
      setPreviewError(null);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      const res = await previewUpsActualCost(detail.orderId, buildInput());
      if (!active) return;
      if (!res.success) {
        setPreview(EMPTY_PREVIEW);
        setPreviewError(res.error ?? t('actionFailed'));
        return;
      }
      setPreviewError(null);
      setPreview({
        totalCostKrw: res.totalCostKrw ?? null,
        appliedExchangeRate: res.appliedExchangeRate ?? null,
        recalc: res.recalc
          ? {
            weightOrDimsChanged: res.recalc.weightOrDimsChanged,
            newAgencyTotal: res.recalc.newAgencyTotal,
            newShipperTotal: res.recalc.newShipperTotal,
          }
          : null,
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settled, hasAnyInput, detail.orderId,
    invoiceNo, invoiceDate, weightKg, lengthCm, widthCm, heightCm,
    baseFreight, fuelSurcharge, surgeFee, otherCharges, notes,
  ]);

  const save = async () => {
    if (!hasAnyInput) {
      setFormError(t('inputRequired'));
      return;
    }
    setSaving(true);
    setFormError(null);
    const pendingFormKey = formKey;
    const res = await recordUpsActualCost(detail.orderId, buildInput());
    setSaving(false);
    if (!res.success) {
      setFormError(res.error ?? t('actionFailed'));
      return;
    }
    setHasSaved(true);
    setSavedFormKey(pendingFormKey);
    toast.success(t('saveSuccess', { amount: formatKrw(res.totalCostKrw ?? 0) }));
    router.refresh();
  };

  const confirmAction = async () => {
    if (!confirmKind) return;
    if (confirmKind === 'settle' && isDirty) {
      setConfirmError(t('dirtyNotice'));
      return;
    }
    setConfirming(true);
    setConfirmError(null);
    const res = confirmKind === 'settle'
      ? await markOrderCostSettled(detail.orderId)
      : await unmarkOrderCostSettled(detail.orderId);
    setConfirming(false);
    if (!res.success) {
      setConfirmError(res.error ?? t('actionFailed'));
      return;
    }
    setStatus(confirmKind === 'settle' ? 'SETTLED' : 'NOT_SETTLED');
    setConfirmKind(null);
    toast.success(confirmKind === 'settle' ? t('markSuccess') : t('unmarkSuccess'));
    router.refresh();
  };

  const listHref = `/${locale}/finance/order-settlement`;
  const exchangeRate = preview.appliedExchangeRate ?? detail.exchangeRate;
  const baseline = detail.revenueBaseline;
  const agencyDelta = preview.recalc ? Math.round(preview.recalc.newAgencyTotal - baseline.agencyTotal) : 0;
  const shipperDelta = preview.recalc ? Math.round(preview.recalc.newShipperTotal - baseline.shipperTotal) : 0;
  const disabled = settled || saving;

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={listHref} className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm">
            <ArrowLeft size={16} />{t('backToList')}
          </Link>
          <h1 className="text-2xl font-bold">{t('detailTitle', { orderNo: detail.orderNo })}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ZenBadge variant={settled ? 'success' : 'warning'}>
            {settled ? t('statusSettled') : t('statusNotSettled')}
          </ZenBadge>
          {detail.legacyInvoiced && <ZenBadge variant="danger">{t('legacyInvoiced')}</ZenBadge>}
        </div>
      </div>

      <ZenCard className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-stone-600">
          <span>{t('labelShipper')}: {detail.shipperName ?? '—'}</span>
          <span>{t('labelAgency')}: {detail.agencyName ?? '—'}</span>
          <span>{t('labelDeliveredAt')}: {formatKstDate(detail.deliveredAt)}</span>
          <span>{t('labelReleasedAt')}: {formatKstDate(detail.releasedAt)}</span>
          <span>{t('labelProduct')}: {detail.upsProductCode ?? '—'}</span>
          <span>{t('labelDestination')}: {detail.recipientCountryCode ?? '—'}</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-stone-600">
          <span>{t('labelExchangeRate')}: {exchangeRate == null ? '—' : formatDecimal(exchangeRate)}</span>
          {settled && detail.costSettledAt && <span>{t('labelSettledAt')}: {formatKstDate(detail.costSettledAt)}</span>}
        </div>
        {settled && (
          <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800 inline-flex items-center gap-2">
            <Lock size={16} />{t('settledNotice')}
          </p>
        )}
        {detail.legacyInvoiced && (
          <p className="rounded-xl bg-amber-50 p-3 text-amber-800" role="status">{t('legacyNotice')}</p>
        )}
        {saved?.krwBased && (
          <p className="rounded-xl bg-stone-50 p-3 text-stone-700" role="status">
            {t('savedKrwNotice', { amount: formatKrw(saved.totalCostKrw) })}
          </p>
        )}
      </ZenCard>

      <ZenCard className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('fieldInvoiceNo')}</span>
            <ZenInput aria-label={t('fieldInvoiceNo')} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} disabled={disabled} />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-stone-500">{t('fieldInvoiceDate')}</span>
            <ZenInput aria-label={t('fieldInvoiceDate')} type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} disabled={disabled} />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-stone-500">
                <th className="py-2 px-1">{t('colItem')}</th>
                <th className="py-2 px-1">{t('colSystemValue')}</th>
                <th className="py-2 px-1">{t('colInvoiceValue')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-1">{t('rowChargeWeight')}</td>
                <td className="py-2 px-1 text-stone-600">
                  {detail.system
                    ? `${formatDecimal(detail.system.chargeableWeightKg)} (${t('volumetricShort')} ${formatDecimal(detail.system.volumetricWeightKg)})`
                    : '—'}
                </td>
                <td className="py-2 px-1">
                  <ZenInput
                    aria-label={t('fieldActualWeight')}
                    type="number"
                    step="0.01"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    disabled={disabled}
                  />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-1">{t('rowBaseFreight')}</td>
                <td className="py-2 px-1 text-stone-400">—</td>
                <td className="py-2 px-1"><ZenInput aria-label={t('fieldBaseFreight')} type="number" step="0.01" value={baseFreight} onChange={(e) => setBaseFreight(e.target.value)} disabled={disabled} /></td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-1">{t('rowFuelSurcharge')}</td>
                <td className="py-2 px-1 text-stone-400">—</td>
                <td className="py-2 px-1"><ZenInput aria-label={t('fieldFuelSurcharge')} type="number" step="0.01" value={fuelSurcharge} onChange={(e) => setFuelSurcharge(e.target.value)} disabled={disabled} /></td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-1">{t('rowSurgeFee')}</td>
                <td className="py-2 px-1 text-stone-400">—</td>
                <td className="py-2 px-1"><ZenInput aria-label={t('fieldSurgeFee')} type="number" step="0.01" value={surgeFee} onChange={(e) => setSurgeFee(e.target.value)} disabled={disabled} /></td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-1">{t('rowOtherCharges')}</td>
                <td className="py-2 px-1 text-stone-400">—</td>
                <td className="py-2 px-1"><ZenInput aria-label={t('fieldOtherCharges')} type="number" step="0.01" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)} disabled={disabled} /></td>
              </tr>
              <tr>
                <td className="py-2 px-1">{t('rowDims')}</td>
                <td className="py-2 px-1 text-stone-400">—</td>
                <td className="py-2 px-1">
                  <div className="grid grid-cols-3 gap-2">
                    <ZenInput aria-label={t('fieldLength')} placeholder={t('fieldLength')} type="number" step="0.01" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} disabled={disabled} />
                    <ZenInput aria-label={t('fieldWidth')} placeholder={t('fieldWidth')} type="number" step="0.01" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} disabled={disabled} />
                    <ZenInput aria-label={t('fieldHeight')} placeholder={t('fieldHeight')} type="number" step="0.01" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} disabled={disabled} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <label className="block text-sm">
          <span className="block mb-1 text-stone-500">{t('fieldNotes')}</span>
          <ZenTextarea aria-label={t('fieldNotes')} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} rows={2} />
        </label>

        {previewError && <p className="text-sm text-rose-600" role="alert">{previewError}</p>}
      </ZenCard>

      <ZenCard className="space-y-3">
        <h2 className="font-semibold">{t('previewTitle')}</h2>
        <p className="text-lg font-semibold">
          {t('previewTotal', { amount: formatKrw(preview.totalCostKrw ?? saved?.totalCostKrw ?? 0) })}
        </p>
        {hasAnyInput && preview.totalCostKrw == null && !previewError && (
          <p className="text-sm text-stone-500">{t('previewPending')}</p>
        )}
        <div className="text-sm text-stone-600 space-y-1">
          <p>{t('recalcAgency', {
            before: formatKrw(baseline.agencyTotal),
            after: formatKrw(preview.recalc?.newAgencyTotal ?? baseline.agencyTotal),
          })}</p>
          <p>{t('recalcShipper', {
            before: formatKrw(baseline.shipperTotal),
            after: formatKrw(preview.recalc?.newShipperTotal ?? baseline.shipperTotal),
          })}</p>
          {preview.recalc && (agencyDelta !== 0 || shipperDelta !== 0) && (
            <p className="text-stone-500">{t('recalcDelta', { agency: formatKrw(agencyDelta), shipper: formatKrw(shipperDelta) })}</p>
          )}
        </div>
      </ZenCard>

      {isDirty && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800" role="status">{t('dirtyNotice')}</p>
      )}
      {formError && <p className="text-sm text-rose-600" role="alert">{formError}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <ZenButton variant="ghost" onClick={() => router.push(listHref)}>{t('backToList')}</ZenButton>
        <ZenButton onClick={save} loading={saving} disabled={settled}>
          <Save size={16} />{t('saveDraft')}
        </ZenButton>
        {settled ? (
          <ZenButton onClick={() => { setConfirmError(null); setConfirmKind('unmark'); }}>
            <RotateCcw size={16} />{t('unmarkSettled')}
          </ZenButton>
        ) : (
          <ZenButton
            onClick={() => { setConfirmError(null); setConfirmKind('settle'); }}
            disabled={detail.legacyInvoiced || !hasSaved || isDirty}
          >
            <ShieldCheck size={16} />{t('markSettled')}
          </ZenButton>
        )}
      </div>

      {confirmKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="zen-glass rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">
              {confirmKind === 'settle' ? t('markConfirmTitle') : t('unmarkConfirmTitle')}
            </h3>
            <p className="text-sm text-stone-700">
              {confirmKind === 'settle' ? t('markConfirmBody') : t('unmarkConfirmBody')}
            </p>
            {confirmError && <p className="text-sm text-rose-600" role="alert">{confirmError}</p>}
            <div className="flex justify-end gap-2">
              <ZenButton variant="ghost" onClick={() => setConfirmKind(null)} disabled={confirming}>{t('close')}</ZenButton>
              <ZenButton onClick={confirmAction} loading={confirming}>
                {confirmKind === 'settle' ? t('markConfirm') : t('unmarkConfirm')}
              </ZenButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
