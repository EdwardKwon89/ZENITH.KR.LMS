'use client';

import { UpsFreightEstimate } from '@/app/actions/ups/freight';

interface UpsFreightEstimatePanelProps {
  estimate: UpsFreightEstimate | null;
  loading: boolean;
  error?: string | null;
}

export function UpsFreightEstimatePanel({ estimate, loading, error }: UpsFreightEstimatePanelProps) {
  if (loading) return <div className="text-sm text-slate-500">견적 계산 중...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!estimate) return null;

  const shipper = estimate.shipper;
  const platform = estimate.platform;

  // 부피중량 표시 (breakdown.volumetricWeightKg — 순수 부피중량)
  const volumetricWeight = platform.breakdown?.volumetricWeightKg ?? 0;

  // 기본운임: 화주 적용가가 있으면 사용, 없으면 플랫폼 기본운임
  const baseFreight = shipper ? shipper.baseSellingPrice : platform.baseSellingPrice;
  const fuelSurcharge = shipper ? shipper.fuelSurchargeSellingAmount : platform.fuelSurchargeSellingAmount;
  const otherCharges = shipper ? shipper.otherChargesSellingTotal : platform.otherChargesSellingTotal;
  const surgeFee = shipper ? shipper.surgeFeeSellingAmount : platform.surgeFeeSellingAmount;
  const finalFreight = shipper ? shipper.finalFreight : platform.totalSellingPrice;
  const otherChargeItems = platform.breakdown?.otherChargeItems ?? [];

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPS 예상 운임</p>
        {volumetricWeight > 0 && (
          <p className="text-[10px] text-slate-500">부피중량: <span className="font-mono font-bold text-slate-700">{volumetricWeight.toFixed(1)}kg</span></p>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">기본운임 {shipper && shipper.shipperDiscountRate > 0 && <span className="text-green-600">(-{(shipper.shipperDiscountRate * 100).toFixed(1)}%)</span>}</span>
          <span className="font-mono font-bold">{baseFreight.toLocaleString()} {platform.currency}</span>
        </div>
        {fuelSurcharge > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">유류할증료</span>
            <span className="font-mono">{fuelSurcharge.toLocaleString()} {platform.currency}</span>
          </div>
        )}
        {otherChargeItems.length > 0 ? (
          otherChargeItems.map((item) => (
            <div key={item.chargeId} className="flex justify-between">
              <span className="text-slate-500">{item.chargeName}</span>
              <span className="font-mono">{(item.sellingBase + item.fuelSurchargeSelling).toLocaleString()} {platform.currency}</span>
            </div>
          ))
        ) : otherCharges > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">기타 부가요금</span>
            <span className="font-mono">{otherCharges.toLocaleString()} {platform.currency}</span>
          </div>
        )}
        {surgeFee > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">급증 긴급 수수료</span>
            <span className="font-mono">{surgeFee.toLocaleString()} {platform.currency}</span>
          </div>
        )}
      </div>

      <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
        <p className="text-xs font-bold text-slate-700">합계</p>
        <p className="text-xl font-black text-blue-700">
          {finalFreight.toLocaleString()}{' '}
          <span className="text-sm font-bold">{platform.currency}</span>
        </p>
      </div>
    </div>
  );
}
