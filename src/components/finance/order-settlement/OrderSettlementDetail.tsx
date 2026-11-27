'use client';

// TASK-B-381 PR-4a (§C) — S2 오더정산 상세를 신규 정산마감 액션으로 전환.
// 미리보기·임시저장·정산마감은 모두 서버 액션이 수행하며, 화면은 응답 금액/상태만 표시한다.
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeft, Lock, Plus, RotateCcw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenTextarea, ZenBadge, ZenSelect } from '@/components/ui/ZenUI';
import {
  previewUpsSettlement,
  saveUpsSettlementDraft,
  finalizeUpsSettlement,
} from '@/app/actions/finance/ups-settlement';
import { unmarkOrderCostSettled } from '@/app/actions/finance/ups-actual-cost';
import type { UpsSettlementInput, UpsSettlementPreview } from '@/lib/ups/settlement/types';
import type { CostSettlementStatus, OrderSettlementDetailData, SavedActualCost } from './types';
import { formatDecimal, formatKrw, formatKstDate, toNumberOrNull } from './types';

export interface OrderSettlementDetailProps {
  detail: OrderSettlementDetailData;
  locale: string;
}

type ConfirmKind = 'settle' | 'unmark' | null;

const CURRENCY_OPTIONS = ['KRW', 'HKD', 'USD'].map((value) => ({ value, label: value }));

interface ChargeRow {
  name: string;
  amount: string;
  currency: string;
}

interface FormState {
  invoiceNo: string;
  invoiceDate: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  baseFreight: string;
  baseCurrency: string;
  fuelSurcharge: string;
  fuelCurrency: string;
  surgeFee: string;
  surgeCurrency: string;
  otherCharges: ChargeRow[];
  notes: string;
}

const EMPTY_CHARGE: ChargeRow = { name: '', amount: '', currency: 'KRW' };

function buildFormState(saved: SavedActualCost | null): FormState {
  // PR-4a 이전(calc_version<3) 초안은 원금액 복원이 불가능하다 — 금액은 비우고 재입력을 요구한다.
  const restoreMoney = saved != null && saved.calcVersion >= 3;
  return {
    invoiceNo: saved?.upsInvoiceNo ?? '',
    invoiceDate: saved?.upsInvoiceDate ?? '',
    weightKg: saved?.actualWeightKg != null ? String(saved.actualWeightKg) : '',
    lengthCm: saved?.actualLengthCm != null ? String(saved.actualLengthCm) : '',
    widthCm: saved?.actualWidthCm != null ? String(saved.actualWidthCm) : '',
    heightCm: saved?.actualHeightCm != null ? String(saved.actualHeightCm) : '',
    baseFreight: restoreMoney && saved?.baseFreightHkd != null ? String(saved.baseFreightHkd) : '',
    baseCurrency: saved?.baseFreightCurrency ?? 'KRW',
    fuelSurcharge: restoreMoney && saved?.fuelSurchargeHkd != null ? String(saved.fuelSurchargeHkd) : '',
    fuelCurrency: saved?.fuelSurchargeCurrency ?? 'KRW',
    surgeFee: restoreMoney && saved?.surgeFeeHkd != null ? String(saved.surgeFeeHkd) : '',
    surgeCurrency: saved?.surgeFeeCurrency ?? 'KRW',
    otherCharges: restoreMoney
      ? (saved?.otherCharges ?? []).map((charge) => ({
        name: charge.name,
        amount: String(charge.amount),
        currency: charge.currency || 'KRW',
      }))
      : [],
    notes: saved?.notes ?? '',
  };
}

export default function OrderSettlementDetail({ detail, locale }: OrderSettlementDetailProps) {
  const t = useTranslations('OrderSettlement');
  const router = useRouter();

  const saved = detail.savedCost;
  const [status, setStatus] = useState<CostSettlementStatus>(detail.settlementStatus);
  const settled = status === 'SETTLED';

  const initialForm = buildFormState(saved);
  const [invoiceNo, setInvoiceNo] = useState(initialForm.invoiceNo);
  const [invoiceDate, setInvoiceDate] = useState(initialForm.invoiceDate);
  const [weightKg, setWeightKg] = useState(initialForm.weightKg);
  const [lengthCm, setLengthCm] = useState(initialForm.lengthCm);
  const [widthCm, setWidthCm] = useState(initialForm.widthCm);
  const [heightCm, setHeightCm] = useState(initialForm.heightCm);
  const [baseFreight, setBaseFreight] = useState(initialForm.baseFreight);
  const [baseCurrency, setBaseCurrency] = useState(initialForm.baseCurrency);
  const [fuelSurcharge, setFuelSurcharge] = useState(initialForm.fuelSurcharge);
  const [fuelCurrency, setFuelCurrency] = useState(initialForm.fuelCurrency);
  const [surgeFee, setSurgeFee] = useState(initialForm.surgeFee);
  const [surgeCurrency, setSurgeCurrency] = useState(initialForm.surgeCurrency);
  const [otherCharges, setOtherCharges] = useState<ChargeRow[]>(initialForm.otherCharges);
  const [notes, setNotes] = useState(initialForm.notes);

  const [preview, setPreview] = useState<UpsSettlementPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const filledCharges = useMemo(
    () => otherCharges.filter((charge) => charge.name.trim() !== '' && toNumberOrNull(charge.amount) != null),
    [otherCharges],
  );

  const hasAnyInput = useMemo(
    () => [weightKg, lengthCm, widthCm, heightCm, baseFreight, fuelSurcharge, surgeFee]
      .some((value) => value.trim() !== '') || filledCharges.length > 0,
    [weightKg, lengthCm, widthCm, heightCm, baseFreight, fuelSurcharge, surgeFee, filledCharges.length],
  );

  const buildInput = (): UpsSettlementInput => {
    const input: UpsSettlementInput = { orderId: detail.orderId };
    const weight = toNumberOrNull(weightKg);
    const length = toNumberOrNull(lengthCm);
    const width = toNumberOrNull(widthCm);
    const height = toNumberOrNull(heightCm);
    const base = toNumberOrNull(baseFreight);
    const fuel = toNumberOrNull(fuelSurcharge);
    const surge = toNumberOrNull(surgeFee);
    if (invoiceNo.trim()) input.upsInvoiceNo = invoiceNo.trim();
    if (invoiceDate) input.upsInvoiceDate = invoiceDate;
    if (weight != null) input.actualWeightKg = weight;
    if (length != null) input.actualLengthCm = length;
    if (width != null) input.actualWidthCm = width;
    if (height != null) input.actualHeightCm = height;
    if (base != null) input.baseFreight = { amount: base, currency: baseCurrency };
    if (fuel != null) input.fuelSurcharge = { amount: fuel, currency: fuelCurrency };
    if (surge != null) input.surgeFee = { amount: surge, currency: surgeCurrency };
    if (filledCharges.length > 0) {
      input.otherCharges = filledCharges.map((charge) => ({
        name: charge.name.trim(),
        amount: toNumberOrNull(charge.amount) as number,
        currency: charge.currency,
      }));
    }
    if (notes.trim()) input.notes = notes.trim();
    return input;
  };

  // 미리보기 300ms 디바운스 — 입력이 바뀔 때마다 서버를 호출하지 않는다.
  useEffect(() => {
    if (settled || !hasAnyInput) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      const res = await previewUpsSettlement(buildInput());
      if (!active) return;
      if (!res.success) {
        setPreview(null);
        setPreviewError(res.error ?? t('actionFailed'));
        return;
      }
      setPreviewError(null);
      setPreview(res.preview ?? null);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settled, hasAnyInput, detail.orderId, baseCurrency, fuelCurrency, surgeCurrency,
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
    const res = await saveUpsSettlementDraft(buildInput());
    setSaving(false);
    if (!res.success) {
      setFormError(res.error ?? t('actionFailed'));
      return;
    }
    toast.success(t('saveSuccess', { amount: formatKrw(preview?.cost.totalCostKrw ?? saved?.totalCostKrw ?? 0) }));
    router.refresh();
  };

  const confirmAction = async () => {
    if (!confirmKind) return;
    setConfirming(true);
    setConfirmError(null);
    const res = confirmKind === 'settle'
      ? await finalizeUpsSettlement(buildInput())
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

  const updateCharge = (index: number, patch: Partial<ChargeRow>) => {
    setOtherCharges((prev) => prev.map((charge, i) => (i === index ? { ...charge, ...patch } : charge)));
  };

  const listHref = `/${locale}/finance/order-settlement`;
  const releasedDate = preview?.releasedDate ?? detail.releasedAt;
  const totalCostKrw = preview?.cost.totalCostKrw ?? saved?.totalCostKrw ?? null;
  const agencyAmount = preview?.amounts.find((a) => a.tier === 'ADMIN_TO_AGENCY');
  const shipperAmount = preview?.amounts.find((a) => a.tier === 'SHIPPER');
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
          <span>{t('labelExchangeRate')}: {preview ? Object.entries(preview.cost.exchangeRates).map(([c, r]) => `${c} ${formatDecimal(r)}`).join(' · ') : (detail.exchangeRate == null ? '—' : formatDecimal(detail.exchangeRate))}</span>
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
        {saved && saved.calcVersion < 3 && (
          <p className="rounded-xl bg-stone-50 p-3 text-stone-700" role="status">{t('savedKrwNotice')}</p>
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
              {([
                ['rowBaseFreight', 'fieldBaseFreight', baseFreight, setBaseFreight, baseCurrency, setBaseCurrency],
                ['rowFuelSurcharge', 'fieldFuelSurcharge', fuelSurcharge, setFuelSurcharge, fuelCurrency, setFuelCurrency],
                ['rowSurgeFee', 'fieldSurgeFee', surgeFee, setSurgeFee, surgeCurrency, setSurgeCurrency],
              ] as const).map(([rowKey, fieldKey, value, setter, currency, setCurrency]) => (
                <tr className="border-b" key={rowKey}>
                  <td className="py-2 px-1">{t(rowKey)}</td>
                  <td className="py-2 px-1 text-stone-400">—</td>
                  <td className="py-2 px-1">
                    <div className="grid grid-cols-2 gap-2">
                      <ZenInput aria-label={t(fieldKey)} type="number" step="0.01" value={value} onChange={(e) => setter(e.target.value)} disabled={disabled} />
                      <ZenSelect aria-label={`${t(fieldKey)} ${t('colChargeCurrency')}`} value={currency} onValueChange={setCurrency} options={CURRENCY_OPTIONS} />
                    </div>
                  </td>
                </tr>
              ))}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-stone-700">{t('rowOtherCharges')}</h3>
            <ZenButton type="button" variant="ghost" onClick={() => setOtherCharges((prev) => [...prev, { ...EMPTY_CHARGE }])} disabled={disabled}>
              <Plus size={14} />{t('addCharge')}
            </ZenButton>
          </div>
          {otherCharges.length === 0 ? (
            <p className="text-xs text-stone-400">—</p>
          ) : (
            <div className="space-y-2">
              {otherCharges.map((charge, index) => (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end" key={`${index}-${charge.name}`}>
                  <div className="md:col-span-5">
                    <span className="block mb-1 text-xs text-stone-500">{t('colChargeName')}</span>
                    <ZenInput aria-label={`${t('colChargeName')} ${index + 1}`} value={charge.name} onChange={(e) => updateCharge(index, { name: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-3">
                    <span className="block mb-1 text-xs text-stone-500">{t('colChargeAmount')}</span>
                    <ZenInput aria-label={`${t('colChargeAmount')} ${index + 1}`} type="number" step="0.01" value={charge.amount} onChange={(e) => updateCharge(index, { amount: e.target.value })} disabled={disabled} />
                  </div>
                  <div className="md:col-span-3">
                    <span className="block mb-1 text-xs text-stone-500">{t('colChargeCurrency')}</span>
                    <ZenSelect aria-label={`${t('colChargeCurrency')} ${index + 1}`} value={charge.currency} onValueChange={(value) => updateCharge(index, { currency: value })} options={CURRENCY_OPTIONS} />
                  </div>
                  <div className="md:col-span-1">
                    <ZenButton type="button" variant="ghost" aria-label={`${t('removeCharge')} ${index + 1}`} onClick={() => setOtherCharges((prev) => prev.filter((_, i) => i !== index))} disabled={disabled}>
                      <Trash2 size={14} />
                    </ZenButton>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          {t('previewTotal', { amount: formatKrw(totalCostKrw ?? 0) })}
        </p>
        {hasAnyInput && totalCostKrw == null && !previewError && (
          <p className="text-sm text-stone-500">{t('previewPending')}</p>
        )}
        {preview && (
          <div className="text-sm text-stone-600 space-y-2">
            <p className="text-stone-500">
              {t('labelReleasedAt')}: {formatKstDate(releasedDate)}
            </p>
            {agencyAmount && (
              <div className="rounded-lg border border-stone-200 p-3">
                <p className="font-medium">{t('tierAgencySettlement')} — {formatKrw(agencyAmount.line_total)}</p>
                <p className="text-xs text-stone-500">
                  {t('rowFreightAdjustment')} {formatKrw(agencyAmount.freight_adjustment)} · {t('rowChargesTotal')} {formatKrw(agencyAmount.settlement_charges_total)}
                </p>
              </div>
            )}
            {shipperAmount && (
              <div className="rounded-lg border border-stone-200 p-3">
                <p className="font-medium">{t('tierShipperSettlement')} — {formatKrw(shipperAmount.line_total)}</p>
                <p className="text-xs text-stone-500">
                  {t('rowFreightAdjustment')} {formatKrw(shipperAmount.freight_adjustment)} · {t('rowChargesTotal')} {formatKrw(shipperAmount.settlement_charges_total)}
                </p>
              </div>
            )}
          </div>
        )}
      </ZenCard>

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
            disabled={!hasAnyInput}
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
