'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, X } from 'lucide-react';
import { recordActualCostAndFinalize, UpsActualCostInput } from '@/app/actions/finance/ups-actual-cost';

interface OtherCharge {
  name: string;
  amount: number;
  currency: string;
}

const CURRENCY_OPTIONS = [
  { value: 'KRW', label: 'KRW' },
  { value: 'USD', label: 'USD' },
  { value: 'HKD', label: 'HKD' },
];

interface BillingConfirmModalProps {
  open: boolean;
  orderId: string;
  orderNo: string;
  invoiceId?: string;
  initialBaseFreight?: number;
  initialFuelSurcharge?: number;
  initialSurgeFee?: number;
  initialOtherCharges?: number;
  onClose: () => void;
  onSuccess: () => void;
}

// TASK-B-317 (Issue #1158, 4단계): 개별 오더 청구확정 팝업
export default function BillingConfirmModal({
  open,
  orderId,
  orderNo,
  invoiceId,
  initialBaseFreight = 0,
  initialFuelSurcharge = 0,
  initialSurgeFee = 0,
  initialOtherCharges = 0,
  onClose,
  onSuccess,
}: BillingConfirmModalProps) {
  const [baseFreightAmount, setBaseFreightAmount] = useState(initialBaseFreight);
  const [baseFreightCurrency, setBaseFreightCurrency] = useState('KRW');
  const [fuelSurchargeKrw, setFuelSurchargeKrw] = useState(initialFuelSurcharge);
  const [surgeFeeKrw, setSurgeFeeKrw] = useState(initialSurgeFee);
  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([]);
  const [reason, setReason] = useState('청구확정');
  const [loading, setLoading] = useState(false);

  const otherChargesTotal = otherCharges.reduce((sum, c) => sum + c.amount, 0);
  // TASK-B-317: 기본운임은 선택 통화로 입력, 환율 적용은 서버에서 처리
  const baseFreightWithAdminFee = Math.round(baseFreightAmount * 1.07);
  const totalKrw = baseFreightWithAdminFee + fuelSurchargeKrw + surgeFeeKrw + otherChargesTotal;

  const addOtherCharge = () => {
    setOtherCharges([...otherCharges, { name: '', amount: 0, currency: 'KRW' }]);
  };

  const updateOtherCharge = (index: number, field: keyof OtherCharge, value: string | number) => {
    const updated = [...otherCharges];
    updated[index] = { ...updated[index], [field]: value };
    setOtherCharges(updated);
  };

  const removeOtherCharge = (index: number) => {
    setOtherCharges(otherCharges.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const input: UpsActualCostInput & {
        baseFreightKrw: number;
        baseFreightCurrency: string;
        fuelSurchargeKrw: number;
        surgeFeeKrw: number;
        otherChargesKrw: number;
        otherCharges?: { name: string; amount: number; currency: string }[];
        invoiceId?: string;
        reason?: string;
      } = {
        baseFreightKrw: baseFreightAmount,
        baseFreightCurrency,
        fuelSurchargeKrw,
        surgeFeeKrw,
        otherChargesKrw: otherChargesTotal,
        otherCharges: otherCharges.filter(c => c.name && c.amount > 0),
        invoiceId,
        reason,
      };

      const result = await recordActualCostAndFinalize(orderId, input);

      if (result.success) {
        toast.success(`청구확정 완료: ${orderNo} (총 ₩${totalKrw.toLocaleString()})`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || '청구확정 실패');
      }
    } catch (err: any) {
      toast.error(err.message || '청구확정 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            청구확정 (실제원가 입력)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          [{orderNo}] 인보이스를 청구확정 처리하시겠습니까?
        </p>

        {/* 기본운임 입력 (+7% admin 원가 자동 계산) + 통화 선택 */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              기본운임
            </label>
            <input
              type="number"
              value={baseFreightAmount}
              onChange={(e) => setBaseFreightAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              placeholder="0"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              +7% admin 원가 = {baseFreightCurrency} {baseFreightWithAdminFee.toLocaleString()}
            </span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              통화
            </label>
            <select
              value={baseFreightCurrency}
              onChange={(e) => setBaseFreightCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              유류할증료 (KRW)
            </label>
            <input
              type="number"
              value={fuelSurchargeKrw}
              onChange={(e) => setFuelSurchargeKrw(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              급증긴급수수료 (KRW)
            </label>
            <input
              type="number"
              value={surgeFeeKrw}
              onChange={(e) => setSurgeFeeKrw(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              유류할증료 (KRW)
            </label>
            <input
              type="number"
              value={fuelSurchargeKrw}
              onChange={(e) => setFuelSurchargeKrw(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              급증긴급수수료 (KRW)
            </label>
            <input
              type="number"
              value={surgeFeeKrw}
              onChange={(e) => setSurgeFeeKrw(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              placeholder="0"
            />
          </div>
        </div>

        {/* TASK-B-317: 기타부가운임 반복 입력 (이름+금액+통화) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              기타부가운임
            </label>
            <button
              type="button"
              onClick={addOtherCharge}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              + 추가
            </button>
          </div>
          {otherCharges.map((charge, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={charge.name}
                onChange={(e) => updateOtherCharge(index, 'name', e.target.value)}
                placeholder="부가운임명"
                className="flex-1 px-2 py-1.5 text-xs border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                value={charge.amount}
                onChange={(e) => updateOtherCharge(index, 'amount', Number(e.target.value))}
                placeholder="금액"
                className="w-24 px-2 py-1.5 text-xs border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              />
              <select
                value={charge.currency}
                onChange={(e) => updateOtherCharge(index, 'currency', e.target.value)}
                className="w-20 px-2 py-1.5 text-xs border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white"
              >
                <option value="KRW">KRW</option>
                <option value="USD">USD</option>
                <option value="HKD">HKD</option>
              </select>
              <button
                type="button"
                onClick={() => removeOtherCharge(index)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        {/* 합계 미리보기 */}
        <div className="bg-slate-50 dark:bg-zinc-900 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">총 합계 (KRW)</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              ₩{totalKrw.toLocaleString()}
            </span>
          </div>
        </div>

        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          마감 사유 (선택)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white mb-4"
          placeholder="마감 사유를 입력하세요"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            청구확정
          </button>
        </div>
      </div>
    </div>
  );
}
