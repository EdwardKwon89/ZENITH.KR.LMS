'use client';

import React, { useEffect, useState } from 'react';
import { recordUpsActualCharges, getUpsActualCharges, getUpsChargeReconciliation } from '@/app/actions/finance/ups-actual-charges';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, HelpCircle } from 'lucide-react';

interface UpsActualAdjustmentFormProps {
  orderId: string;
  orderStatus: string;
  isPlatformAdmin: boolean;
}

interface ChargeRow {
  chargeType: string;
  amount: number;
  currency: string;
  upsInvoiceNo: string;
  upsInvoiceDate: string;
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
    actual: number;
    variance: number;
    currency: string;
    isFinalized: boolean;
  } | null>(null);

  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [isInvoiced, setIsInvoiced] = useState(false);

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
            upsInvoiceNo: c.ups_invoice_no || '',
            upsInvoiceDate: c.ups_invoice_date || '',
            notes: c.notes || '',
          }))
        );
      } else {
        // Default row
        setCharges([
          {
            chargeType: 'BASE FREIGHT',
            amount: recon.estimated > 0 ? recon.estimated : 0,
            currency: recon.currency || 'USD',
            upsInvoiceNo: '',
            upsInvoiceDate: '',
            notes: '',
          },
        ]);
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
  }, [orderId]);

  const handleAddRow = () => {
    const defaultCurrency = reconciliation?.currency || 'USD';
    setCharges([
      ...charges,
      {
        chargeType: '',
        amount: 0,
        currency: defaultCurrency,
        upsInvoiceNo: '',
        upsInvoiceDate: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (charges.length === 1) {
      setCharges([
        {
          chargeType: '',
          amount: 0,
          currency: reconciliation?.currency || 'USD',
          upsInvoiceNo: '',
          upsInvoiceDate: '',
          notes: '',
        },
      ]);
      return;
    }
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
        upsInvoiceNo: c.upsInvoiceNo.trim() || undefined,
        upsInvoiceDate: c.upsInvoiceDate || undefined,
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
      <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-zinc-900 border rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-gray-500 dark:text-zinc-400">UPS 정산 정보를 불러오는 중...</span>
      </div>
    );
  }

  const actualTotal = charges.reduce((sum, c) => sum + c.amount, 0);
  const estimatedTotal = reconciliation?.estimated || 0;
  const variance = actualTotal - estimatedTotal;
  const currency = reconciliation?.currency || 'USD';

  return (
    <div className="border rounded-lg bg-white dark:bg-zinc-950 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
            UPS 사후청구 요금 및 정산 조정 (Actual Charges)
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            배송 완료(`DELIVERED`) 이후 UPS 실제 청구서를 바탕으로 예상 운임과의 차액을 조정합니다.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-gray-50 dark:bg-zinc-900 border px-3 py-1.5 rounded">
          <span className="font-semibold text-gray-600 dark:text-zinc-400">주문 상태:</span>
          <span className={`px-2 py-0.5 rounded-full font-bold ${
            orderStatus === 'DELIVERED'
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
          }`}>
            {orderStatus}
          </span>
        </div>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-zinc-900">
          <div className="text-xs text-gray-500 dark:text-zinc-400">예상 청구액 (Estimated)</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">
            {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">최초 예상 운임 스냅샷 합산액</p>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-zinc-900">
          <div className="text-xs text-gray-500 dark:text-zinc-400">실제 청구액 (Actual)</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {actualTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">아래 입력된 실제 항목의 합산액</p>
        </div>

        <div className={`border rounded-lg p-4 ${
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
                    ? '크레딧 노트가 발행되었습니다'
                    : '인보이스 금액이 차감 조정됩니다')
                : '차액 없음 (조정 비용 불필요)'}
          </p>
        </div>
      </div>

      {/* Charge Row Editor Table */}
      <div className="overflow-x-auto mb-6 border rounded-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 border-b text-gray-700 dark:text-zinc-300">
              <th className="p-3 w-1/4">청구 유형 (Charge Type)</th>
              <th className="p-3 w-1/6">금액 (Amount)</th>
              <th className="p-3 w-1/12">통화</th>
              <th className="p-3 w-1/6">청구서 번호</th>
              <th className="p-3 w-1/6">청구 날짜</th>
              <th className="p-3 w-1/4">메모</th>
              {isEditable && <th className="p-3 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {charges.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50/50 dark:hover:bg-zinc-900/50">
                <td className="p-3">
                  {isEditable ? (
                    <>
                      <input
                        list="ups-charge-types"
                        type="text"
                        value={row.chargeType}
                        onChange={(e) => handleChangeRow(index, 'chargeType', e.target.value)}
                        placeholder="예: FUEL SURCHARGE"
                        className="w-full px-2 py-1.5 border rounded dark:bg-zinc-900 dark:border-zinc-700 text-sm"
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
                    <input
                      type="number"
                      value={row.amount || ''}
                      onChange={(e) => handleChangeRow(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-2 py-1.5 border rounded dark:bg-zinc-900 dark:border-zinc-700 text-sm font-mono text-right"
                    />
                  ) : (
                    <span className="font-mono text-right block">
                      {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <select
                      value={row.currency}
                      onChange={(e) => handleChangeRow(index, 'currency', e.target.value)}
                      className="w-full px-1 py-1.5 border rounded dark:bg-zinc-900 dark:border-zinc-700 text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="KRW">KRW</option>
                      <option value="TWD">TWD</option>
                      <option value="RMB">RMB</option>
                      <option value="JPY">JPY</option>
                    </select>
                  ) : (
                    <span>{row.currency}</span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <input
                      type="text"
                      value={row.upsInvoiceNo}
                      onChange={(e) => handleChangeRow(index, 'upsInvoiceNo', e.target.value)}
                      placeholder="참고용 청구서번호"
                      className="w-full px-2 py-1.5 border rounded dark:bg-zinc-900 dark:border-zinc-700 text-sm"
                    />
                  ) : (
                    <span>{row.upsInvoiceNo || '—'}</span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <input
                      type="date"
                      value={row.upsInvoiceDate}
                      onChange={(e) => handleChangeRow(index, 'upsInvoiceDate', e.target.value)}
                      className="w-full px-2 py-1.5 border rounded dark:bg-zinc-900 dark:border-zinc-700 text-sm"
                    />
                  ) : (
                    <span>{row.upsInvoiceDate || '—'}</span>
                  )}
                </td>
                <td className="p-3">
                  {isEditable ? (
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => handleChangeRow(index, 'notes', e.target.value)}
                      placeholder="비고 입력"
                      className="w-full px-2 py-1.5 border rounded dark:bg-zinc-900 dark:border-zinc-700 text-sm"
                    />
                  ) : (
                    <span className="text-gray-500 dark:text-zinc-400 text-xs">{row.notes || '—'}</span>
                  )}
                </td>
                {isEditable && (
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditable ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center text-xs font-semibold text-primary hover:text-primary/80 border border-primary/20 px-3 py-1.5 rounded hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            청구 항목 추가
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={loadData}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border"
            >
              초기화
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center text-xs font-bold text-white bg-primary hover:bg-primary/95 px-4 py-2 rounded shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  반영 중...
                </>
              ) : (
                '실제 청구 및 차액 정산 반영'
              )}
            </button>
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
    </div>
  );
}
