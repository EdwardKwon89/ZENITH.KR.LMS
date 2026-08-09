'use client';

import React, { useEffect, useState } from 'react';
import { recordUpsActualCharges, getUpsActualCharges, getUpsChargeReconciliation } from '@/app/actions/finance/ups-actual-charges';
import { recordUpsActualCost, previewUpsActualCost, getUpsActualCost } from '@/app/actions/finance/ups-actual-cost';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, HelpCircle, Calculator } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenSelect, ZenBadge } from '@/components/ui/ZenUI';
import { getCostTypeLabel } from '@/lib/finance/settlement/cost-type-labels';

function AcInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1">{label}</span>
      <ZenInput {...props} />
    </label>
  );
}

interface UpsActualAdjustmentFormProps {
  orderId: string;
  orderStatus: string;
  isPlatformAdmin: boolean;
}

interface ChargeRow {
  chargeType: string;
  amount: number;
  currency: string;
  notes: string;
}

export function UpsActualAdjustmentForm({
  orderId,
  orderStatus,
  isPlatformAdmin,
}: UpsActualAdjustmentFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reconciliation, setReconciliation] = useState<{
    estimated: number;
    estimatedBreakdown: Array<{ costType: string; amount: number; currency: string }>;
    actual: number;
    variance: number;
    currency: string;
    isFinalized: boolean;
    invoiceNo: string | null;
    invoiceDate: string | null;
  } | null>(null);

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [isInvoiced, setIsInvoiced] = useState(false);

  // ─── 실제 원가 확정 (Issue #1009) ──────────────────────────────
  const [acForm, setAcForm] = useState({
    upsInvoiceNo: '',
    upsInvoiceDate: '',
    actualWeightKg: '',
    actualLengthCm: '',
    actualWidthCm: '',
    actualHeightCm: '',
    baseFreightHkd: '',
    fuelSurchargeHkd: '',
    surgeFeeHkd: '',
    otherChargesHkd: '',
    notes: '',
  });
  const [acSaved, setAcSaved] = useState<Record<string, any> | null>(null);
  const [acPreview, setAcPreview] = useState<Record<string, any> | null>(null);
  const [acSaving, setAcSaving] = useState(false);
  const [acError, setAcError] = useState<string | null>(null);

  const acEditable = isPlatformAdmin && (orderStatus === 'DELIVERED' || orderStatus === 'IN_TRANSIT');

  const loadActualCost = async () => {
    try {
      const rec = await getUpsActualCost(orderId);
      if (rec) {
        setAcForm({
          upsInvoiceNo: rec.ups_invoice_no || '',
          upsInvoiceDate: rec.ups_invoice_date || '',
          actualWeightKg: rec.actual_weight_kg != null ? String(rec.actual_weight_kg) : '',
          actualLengthCm: rec.actual_length_cm != null ? String(rec.actual_length_cm) : '',
          actualWidthCm: rec.actual_width_cm != null ? String(rec.actual_width_cm) : '',
          actualHeightCm: rec.actual_height_cm != null ? String(rec.actual_height_cm) : '',
          baseFreightHkd: rec.base_freight_hkd != null ? String(rec.base_freight_hkd) : '',
          fuelSurchargeHkd: rec.fuel_surcharge_hkd != null ? String(rec.fuel_surcharge_hkd) : '',
          surgeFeeHkd: rec.surge_fee_hkd != null ? String(rec.surge_fee_hkd) : '',
          otherChargesHkd: rec.other_charges_hkd != null ? String(rec.other_charges_hkd) : '',
          notes: rec.notes || '',
        });
        setAcSaved(rec);
      }
    } catch (err: any) {
      console.error('Error loading UPS actual cost:', err);
    }
  };

  const handleAcField = (field: keyof typeof acForm, value: string) => {
    setAcForm((prev) => ({ ...prev, [field]: value }));
    setAcError(null);
    setAcPreview(null);
  };

  const buildAcInput = () => ({
    upsInvoiceNo: acForm.upsInvoiceNo.trim() || undefined,
    upsInvoiceDate: acForm.upsInvoiceDate || undefined,
    actualWeightKg: acForm.actualWeightKg !== '' ? Number(acForm.actualWeightKg) : undefined,
    actualLengthCm: acForm.actualLengthCm !== '' ? Number(acForm.actualLengthCm) : undefined,
    actualWidthCm: acForm.actualWidthCm !== '' ? Number(acForm.actualWidthCm) : undefined,
    actualHeightCm: acForm.actualHeightCm !== '' ? Number(acForm.actualHeightCm) : undefined,
    baseFreightHkd: Number(acForm.baseFreightHkd) || 0,
    fuelSurchargeHkd: Number(acForm.fuelSurchargeHkd) || 0,
    surgeFeeHkd: Number(acForm.surgeFeeHkd) || 0,
    otherChargesHkd: Number(acForm.otherChargesHkd) || 0,
    notes: acForm.notes.trim() || undefined,
  });

  const handleAcPreview = async () => {
    try {
      setAcError(null);
      setAcPreview(null);
      const res = await previewUpsActualCost(orderId, buildAcInput());
      if (res.success) setAcPreview(res);
      else setAcError(res.error || '미리보기 실패');
    } catch (err: any) {
      setAcError(err.message || '미리보기 실패');
    }
  };

  const handleAcSave = async () => {
    const hkdTotal = Number(acForm.baseFreightHkd) + Number(acForm.fuelSurchargeHkd) + Number(acForm.surgeFeeHkd) + Number(acForm.otherChargesHkd);
    if (!(hkdTotal > 0)) {
      toast.error('HKD 금액(기본운임·유류할증·급증긴급수수료·기타) 중 최소 1개는 0보다 커야 합니다.');
      return;
    }

    try {
      setAcSaving(true);
      setAcError(null);
      const res = await recordUpsActualCost(orderId, buildAcInput());
      if (res.success) {
        setAcSaved(res);
        setAcPreview(res);
        toast.success('UPS 실제 원가가 확정·반영되었습니다.');
        loadData();
      } else {
        setAcError(res.error || '저장 실패');
        toast.error(res.error || '저장 실패');
      }
    } catch (err: any) {
      setAcError(err.message || '저장 실패');
      toast.error(err.message || '저장 실패');
    } finally {
      setAcSaving(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const recon = await getUpsChargeReconciliation(orderId);
      setReconciliation(recon);

      const actuals = await getUpsActualCharges(orderId);
      if (actuals && actuals.length > 0) {
        setCharges(
          actuals.map((c) => ({
            chargeType: c.charge_type,
            amount: Number(c.charge_amount),
            currency: c.currency,
            notes: c.notes || '',
          }))
        );
      } else {
        setCharges([]);
      }

      // Check if there is already an invoiced adjustment
      // In a real scenario, we can inspect if any zen_order_costs with cost_type 'UPS_ACTUAL_ADJUSTMENT' has invoice_id
      // (This logic is also enforced on the server-side action)
      // For simplicity, we can fetch costs or rely on the server validation on save.
    } catch (err: any) {
      console.error('Error loading UPS actual charges:', err);
      toast.error('UPS 실제 요금 정보를 불러오는 중 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadActualCost();
  }, [orderId]);

  const handleAddRow = () => {
    const defaultCurrency = reconciliation?.currency || 'USD';
    setCharges([
      ...charges,
      {
        chargeType: '',
        amount: 0,
        currency: defaultCurrency,
        notes: '',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index));
  };

  const handleChangeRow = (index: number, field: keyof ChargeRow, value: any) => {
    const updated = [...charges];
    if (field === 'amount') {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setCharges(updated);
  };

  const handleSave = async () => {
    // Validation
    const invalidRow = charges.some((c) => !c.chargeType.trim() || c.amount < 0);
    if (invalidRow) {
      toast.error('청구 유형을 입력하고 금액은 0 이상이어야 합니다.');
      return;
    }

    try {
      setSaving(true);
      const payload = charges.map((c) => ({
        chargeType: c.chargeType.trim(),
        amount: c.amount,
        currency: c.currency,
        notes: c.notes.trim() || undefined,
      }));

      const res = await recordUpsActualCharges(orderId, payload);
      if (res.success) {
        toast.success('UPS 실제 청구 요금 및 조정 비용이 성공적으로 반영되었습니다.');
        loadData();
      } else {
        toast.error(res.error || '저장 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      toast.error(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const isEditable = isPlatformAdmin && orderStatus === 'DELIVERED';

  if (loading) {
    return (
      <ZenCard className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-gray-500 dark:text-zinc-400">UPS 정산 정보를 불러오는 중...</span>
        </div>
      </ZenCard>
    );
  }

  const actualTotal = reconciliation?.actual ?? 0;
  const estimatedTotal = reconciliation?.estimated || 0;
  const variance = reconciliation?.variance ?? 0;
  const currency = reconciliation?.currency || 'USD';

  return (
    <ZenCard className="p-6">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
            UPS 사후청구 요금 및 정산 조정 (Actual Charges)
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            배송 완료(`DELIVERED`) 이후 UPS 실제 청구서를 바탕으로 예상 운임과의 차액을 조정합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-gray-600 dark:text-zinc-400">주문 상태:</span>
          <ZenBadge className={`font-bold ${
            orderStatus === 'DELIVERED'
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
          }`}>
            {orderStatus}
          </ZenBadge>
        </div>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ZenCard className="p-4 bg-gray-50 dark:bg-zinc-900">
          <div className="text-xs text-gray-500 dark:text-zinc-400">예상 청구액 (Estimated)</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">
            {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">최초 예상 운임 스냅샷 합산액</p>
        </ZenCard>

        <ZenCard className="p-4 bg-gray-50 dark:bg-zinc-900">
          <div className="text-xs text-gray-500 dark:text-zinc-400">실제 청구액 (Actual)</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {actualTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">예상 청구액 + 아래 추가 등록된 부가요금의 합산액</p>
          {reconciliation?.invoiceNo && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-700 text-[11px] text-gray-500 dark:text-zinc-400 space-y-0.5">
              <div>청구서 번호: <span className="font-mono">{reconciliation.invoiceNo}</span></div>
              <div>청구 날짜: {new Date(reconciliation.invoiceDate!).toLocaleDateString('ko-KR')}</div>
            </div>
          )}
        </ZenCard>

        <ZenCard className={`p-4 ${
          variance > 0
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
            : variance < 0
              ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
              : 'bg-gray-50 dark:bg-zinc-900'
        }`}>
          <div className="text-xs text-gray-500 dark:text-zinc-400">조정 차액 (Variance)</div>
          <div className={`text-2xl font-bold mt-1 ${
            variance > 0
              ? 'text-red-600 dark:text-red-400'
              : variance < 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-800 dark:text-gray-200'
          }`}>
            {variance > 0 ? '+' : ''}
            {variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
            {variance > 0
              ? (reconciliation?.isFinalized
                  ? '추가 인보이스가 신규 발행되었습니다'
                  : '인보이스 금액이 자동 갱신됩니다')
              : variance < 0
                ? (reconciliation?.isFinalized
                    ? '차감 인보이스가 발행되었습니다'
                    : '인보이스 금액이 차감 조정됩니다')
                : '차액 없음 (조정 비용 불필요)'}
          </p>
        </ZenCard>
      </div>

      {/* Charge Row Editor Table */}
      <ZenCard className="p-0 overflow-hidden mb-6">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 border-b text-gray-700 dark:text-zinc-300">
              <th className="p-3 w-20">구분</th>
              <th className="p-3 w-1/3">청구 유형 (Charge Type)</th>
              <th className="p-3 w-1/6">금액 (Amount)</th>
              <th className="p-3 w-1/12">통화</th>
              <th className="p-3 w-1/3">메모</th>
              {isEditable && <th className="p-3 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {reconciliation?.estimatedBreakdown?.map((item, i) => (
              <tr key={`est-${i}`} className="border-b bg-gray-50/50 dark:bg-zinc-900/50">
                <td className="p-3"><ZenBadge className="bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300">예상</ZenBadge></td>
                <td className="p-3 font-semibold">{getCostTypeLabel(item.costType)}</td>
                <td className="p-3"><span className="font-mono text-right block">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                <td className="p-3">{item.currency}</td>
                <td className="p-3 text-gray-400 text-xs">—</td>
                {isEditable && <td className="p-3"></td>}
              </tr>
            ))}
            {charges.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50/50 dark:hover:bg-zinc-900/50">
                <td className="p-3"><ZenBadge className="bg-primary/10 text-primary">추가</ZenBadge></td>
                <td className="p-3">
                  {isEditable ? (
                    <>
                      <ZenInput
                        type="text"
                        list="ups-charge-types"
                        value={row.chargeType}
                        onChange={(e) => handleChangeRow(index, 'chargeType', e.target.value)}
                        placeholder="예: FUEL SURCHARGE"
                        className="w-full"
                      />
                      <datalist id="ups-charge-types">
                        <option value="BASE FREIGHT" />
                        <option value="FUEL SURCHARGE" />
                        <option value="RESIDENTIAL SURCHARGE" />
                        <option value="ADDRESS CORRECTION" />
                        <option value="DAS (Delivery Area Surcharge)" />
                        <option value="PEAK SEASON SURCHARGE" />
                        <option value="OVERSIZE CHARGE" />
                        <option value="OTHER" />
                      </datalist>
                    </>
                  ) : (
                    <span className="font-semibold">{row.chargeType}</span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <ZenInput
                      type="number"
                      value={row.amount || ''}
                      onChange={(e) => handleChangeRow(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full font-mono text-right"
                    />
                  ) : (
                    <span className="font-mono text-right block">
                      {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <ZenSelect
                      value={row.currency}
                      onValueChange={(value) => handleChangeRow(index, 'currency', value)}
                      options={[
                        { value: 'USD', label: 'USD' },
                        { value: 'KRW', label: 'KRW' },
                        { value: 'TWD', label: 'TWD' },
                        { value: 'RMB', label: 'RMB' },
                        { value: 'JPY', label: 'JPY' },
                      ]}
                      className="w-full"
                    />
                  ) : (
                    <span>{row.currency}</span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <ZenInput
                      type="text"
                      value={row.notes}
                      onChange={(e) => handleChangeRow(index, 'notes', e.target.value)}
                      placeholder="비고 입력"
                      className="w-full"
                    />
                  ) : (
                    <span className="text-gray-500 dark:text-zinc-400 text-xs">{row.notes || '—'}</span>
                  )}
                </td>
                {isEditable && (
                  <td className="p-3 text-center">
                    <ZenButton
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </ZenButton>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ZenCard>

      {isEditable ? (
        <div className="flex items-center justify-between">
          <ZenButton
            type="button"
            onClick={handleAddRow}
            className="flex items-center text-xs font-semibold text-primary border border-primary/20 px-3 py-1.5"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            청구 항목 추가
          </ZenButton>
          <div className="flex items-center space-x-3">
            <ZenButton
              type="button"
              onClick={loadData}
              className="text-xs text-gray-500 px-3 py-1.5 border rounded"
            >
              초기화
            </ZenButton>
            <ZenButton
              type="button"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              className="flex items-center text-xs font-bold text-white bg-primary px-4 py-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  반영 중...
                </>
              ) : (
                '실제 청구 및 차액 정산 반영'
              )}
            </ZenButton>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-500 dark:text-zinc-400 flex items-center bg-gray-50 dark:bg-zinc-900 border p-3 rounded">
          <HelpCircle className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <span>
            {orderStatus !== 'DELIVERED'
              ? '오더가 배송 완료(`DELIVERED`) 상태가 되어야 실제 청구 요금 입력창이 활성화됩니다.'
              : '현재 로그인한 계정은 관리자 권한이 없으므로 UPS 실제 청구 내역을 조회만 할 수 있습니다.'}
          </span>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-zinc-800 pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-100">UPS 실제 원가 확정 (매입)</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              UPS 청구서 기준으로 부피·최종중량·요금을 확정하고, RELEASED일 환율로 KRW 환산된 매입 원가를 반영합니다.
            </p>
          </div>
          {acSaved && (
            <ZenBadge variant="success" className="text-xs">
              확정 완료
            </ZenBadge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <AcInput
            label="UPS 청구서 번호"
            value={acForm.upsInvoiceNo}
            onChange={(e) => handleAcField('upsInvoiceNo', e.target.value)}
            disabled={!acEditable}
            placeholder="예: 1Z…"
          />
          <AcInput
            label="청구서 발행일"
            type="date"
            value={acForm.upsInvoiceDate}
            onChange={(e) => handleAcField('upsInvoiceDate', e.target.value)}
            disabled={!acEditable}
          />
          <AcInput
            label="실측 중량 (kg)"
            type="number"
            value={acForm.actualWeightKg}
            onChange={(e) => handleAcField('actualWeightKg', e.target.value)}
            disabled={!acEditable}
            placeholder="예: 18.5"
          />
          <div className="grid grid-cols-3 gap-2">
            <AcInput
              label="L (cm)"
              type="number"
              value={acForm.actualLengthCm}
              onChange={(e) => handleAcField('actualLengthCm', e.target.value)}
              disabled={!acEditable}
            />
            <AcInput
              label="W (cm)"
              type="number"
              value={acForm.actualWidthCm}
              onChange={(e) => handleAcField('actualWidthCm', e.target.value)}
              disabled={!acEditable}
            />
            <AcInput
              label="H (cm)"
              type="number"
              value={acForm.actualHeightCm}
              onChange={(e) => handleAcField('actualHeightCm', e.target.value)}
              disabled={!acEditable}
            />
          </div>
          <AcInput
            label="기본운임 (HKD)"
            type="number"
            value={acForm.baseFreightHkd}
            onChange={(e) => handleAcField('baseFreightHkd', e.target.value)}
            disabled={!acEditable}
            placeholder="0"
          />
          <AcInput
            label="유류할증 (HKD)"
            type="number"
            value={acForm.fuelSurchargeHkd}
            onChange={(e) => handleAcField('fuelSurchargeHkd', e.target.value)}
            disabled={!acEditable}
            placeholder="0"
          />
          <AcInput
            label="급증긴급수수료 (HKD)"
            type="number"
            value={acForm.surgeFeeHkd}
            onChange={(e) => handleAcField('surgeFeeHkd', e.target.value)}
            disabled={!acEditable}
            placeholder="0"
          />
          <AcInput
            label="기타 (HKD)"
            type="number"
            value={acForm.otherChargesHkd}
            onChange={(e) => handleAcField('otherChargesHkd', e.target.value)}
            disabled={!acEditable}
            placeholder="0"
          />
        </div>

        <AcInput
          label="메모"
          value={acForm.notes}
          onChange={(e) => handleAcField('notes', e.target.value)}
          disabled={!acEditable}
          className="mb-4"
          placeholder="청구서 특이사항 등"
        />

        {acPreview && (
          <div className="bg-gray-50 dark:bg-zinc-900 border border-primary/20 p-4 rounded-lg mb-4 space-y-2 text-sm">
            <div className="flex items-center text-xs font-bold text-primary">
              <Calculator className="w-4 h-4 mr-1.5" />
              원가 계산 결과
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-gray-500 dark:text-zinc-400">HKD 합계</div>
                <div className="font-bold text-gray-800 dark:text-zinc-100">HKD {acPreview.hkdTotal?.toLocaleString('ko-KR')}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-zinc-400">적용 환율 (RELEASED일)</div>
                <div className="font-bold text-gray-800 dark:text-zinc-100">{acPreview.appliedExchangeRate?.toLocaleString('ko-KR', { maximumFractionDigits: 4 })} KRW/HKD</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-zinc-400">원가 (KRW)</div>
                <div className="font-bold text-primary">{acPreview.totalCostKrw?.toLocaleString('ko-KR')} 원</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-zinc-400">RELEASED일</div>
                <div className="font-bold text-gray-800 dark:text-zinc-100">{acPreview.releasedDate || '—'}</div>
              </div>
            </div>
            {acPreview.recalc?.weightOrDimsChanged && (
              <div className="text-xs text-gray-600 dark:text-zinc-300 border-t border-gray-200 dark:border-zinc-800 pt-2">
                부피·중량 변경 감지 — 매출(최종운임)이 재계산됩니다.
                {acPreview.recalc.newAgencyTotal != null && (
                  <div>· Agency 최종운임 재계산: <b>{acPreview.recalc.newAgencyTotal.toLocaleString('ko-KR')} KRW</b></div>
                )}
                {acPreview.recalc.newShipperTotal != null && (
                  <div>· Shipper 최종운임 재계산: <b>{acPreview.recalc.newShipperTotal.toLocaleString('ko-KR')} KRW</b></div>
                )}
              </div>
            )}
          </div>
        )}

        {acError && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded mb-4">
            {acError}
          </div>
        )}

        {acEditable ? (
          <div className="flex items-center justify-end space-x-3">
            <ZenButton
              type="button"
              onClick={handleAcPreview}
              className="text-xs text-gray-600 px-3 py-1.5 border rounded"
            >
              미리보기
            </ZenButton>
            <ZenButton
              type="button"
              onClick={handleAcSave}
              disabled={acSaving}
              loading={acSaving}
              className="flex items-center text-xs font-bold text-white bg-primary px-4 py-2"
            >
              {acSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  확정 중...
                </>
              ) : acSaved ? (
                '원가 재확정'
              ) : (
                '실제 원가 확정'
              )}
            </ZenButton>
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-zinc-400 flex items-center bg-gray-50 dark:bg-zinc-900 border p-3 rounded">
            <HelpCircle className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <span>
              {orderStatus !== 'DELIVERED'
                ? '오더가 배송 완료(`DELIVERED`) 상태가 되어야 실제 원가를 확정할 수 있습니다.'
                : '현재 로그인한 계정은 관리자 권한이 없으므로 UPS 실제 원가를 조회만 할 수 있습니다.'}
            </span>
          </div>
        )}
      </div>
    </ZenCard>
  );
}
