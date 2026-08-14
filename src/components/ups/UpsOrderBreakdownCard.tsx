'use client';

import React from 'react';
import { Package, ShieldCheck, Scale, Zap, Globe, DollarSign } from 'lucide-react';
import { ZenBadge } from '@/components/ui/ZenUI';

interface UpsOrderBreakdownCardProps {
  orderNo: string;
  destCountryCode: string;
  transportMode: string;
  snapshotMeta?: Record<string, any> | null;
  cargoDetails?: Record<string, any> | null;
  packages?: any[];
}

export default function UpsOrderBreakdownCard({
  orderNo,
  destCountryCode,
  transportMode,
  snapshotMeta,
  cargoDetails,
  packages = [],
}: UpsOrderBreakdownCardProps) {
  // Extract Zone and Product info
  const productCode =
    cargoDetails?.product_code
    ?? snapshotMeta?.platform?.breakdown?.product?.product_name
    ?? snapshotMeta?.platform?.breakdown?.product?.product_code
    ?? snapshotMeta?.productCode
    ?? '-';
  const zoneId =
    snapshotMeta?.platform?.breakdown?.zone?.zone_name
    ?? snapshotMeta?.platform?.breakdown?.zone?.zone_code
    ?? snapshotMeta?.zoneId ?? snapshotMeta?.zoneCode ?? snapshotMeta?.zone_id
    ?? '-';

  // Calculate weights
  const actualWeight = packages.reduce((sum, p) => sum + Number(p.gross_weight || 0), 0);
  const totalVolumetricWeight = packages.reduce((sum, p) => {
    const vol = p.volume ?? (p.length && p.width && p.height ? (p.length * p.width * p.height) / 1000000 : 0);
    return sum + (vol * 1000000) / 5000;
  }, 0);
  const billableWeight = Math.max(actualWeight, totalVolumetricWeight, Number(snapshotMeta?.chargeableWeight || 0));
  const billingWeightKg = Number(snapshotMeta?.platform?.breakdown?.billingWeightKg ?? snapshotMeta?.platform?.billingWeightKg ?? billableWeight);

  // Extract Breakdown
  const platformMeta = snapshotMeta?.platform;
  const breakdown = platformMeta?.breakdown || {};

  const baseFreight = Number(breakdown.baseSellingPrice ?? breakdown.baseFreight ?? breakdown.freight ?? platformMeta?.freightCostPrice ?? 0);
  const fuelSurcharge = Number(breakdown.fuelSurchargeSellingAmount ?? breakdown.fuelSurcharge ?? 0);
  const surgeFee = Number(breakdown.surgeFeeSellingAmount ?? breakdown.surgeFee ?? breakdown.surgeEmergencyFee ?? 0);
  const extraCharges = Number(breakdown.otherChargesSellingTotal ?? breakdown.extraCharges ?? breakdown.additionalCharges ?? 0);
  const totalFreight = Number(platformMeta?.totalSellingPrice ?? (baseFreight + fuelSurcharge + surgeFee + extraCharges));
  const currencyCode = String(platformMeta?.currency || 'USD');
  const currencySymbol = currencyCode === 'KRW' ? '₩' : currencyCode === 'USD' ? '$' : '';
  // TASK-B-302 (Issue #1123): KRW는 올림된 정수값이므로 소수점 미표시, USD는 2자리(센트) 표시 유지
  const fmtAmount = (n: number) =>
    currencyCode === 'KRW'
      ? n.toLocaleString()
      : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-amber-950 text-white rounded-3xl p-6 shadow-xl border border-amber-500/20 flex flex-col gap-6">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-500/20 text-amber-400 p-2.5 rounded-2xl border border-amber-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-amber-200">UPS 특송 전용 상세 정보</span>
              <ZenBadge className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {productCode}
              </ZenBadge>
            </div>
            <p className="text-xs text-slate-400 font-mono">Order No: {orderNo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-slate-300">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>도착국: <strong className="text-white">{destCountryCode}</strong></span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-amber-300 font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Zone: {zoneId}</span>
          </div>
        </div>
      </div>

      {/* Weight Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">실측 총 중량 (Gross)</span>
          <span className="text-sm font-bold font-mono text-slate-200">{actualWeight.toFixed(2)} kg</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">부피 중량 (Volumetric)</span>
          <span className="text-sm font-bold font-mono text-slate-200">{totalVolumetricWeight.toFixed(2)} kg</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Scale className="w-3 h-3" /> 과금 기준 중량 (Chargeable)
          </span>
          <span className="text-sm font-extrabold font-mono text-amber-300">{billableWeight.toFixed(2)} kg</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Scale className="w-3 h-3" /> 청구중량 (Billing Weight)
          </span>
          <span className="text-base font-extrabold font-mono text-amber-300">{billingWeightKg.toFixed(2)} kg</span>
        </div>
      </div>

      {/* Freight Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          운임 세부 내역 (Freight Breakdown)
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300 py-1 border-b border-white/5">
            <span>기본 운임 (Base Freight)</span>
            <span className="font-mono text-white font-semibold">{currencySymbol}{fmtAmount(baseFreight)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300 py-1 border-b border-white/5">
            <span>유류 할증료 (Fuel Surcharge)</span>
            <span className="font-mono text-white font-semibold">{currencySymbol}{fmtAmount(fuelSurcharge)}</span>
          </div>
          {surgeFee > 0 && (
            <div className="flex justify-between items-center text-amber-300 py-1 border-b border-white/5 font-semibold">
              <span>UPS 급증 긴급 수수료 (Surge Fee)</span>
              <span className="font-mono">{currencySymbol}{fmtAmount(surgeFee)}</span>
            </div>
          )}
          {extraCharges > 0 && (
            <div className="flex justify-between items-center text-slate-300 py-1 border-b border-white/5">
              <span>기타 부가 수수료 (Surcharges)</span>
              <span className="font-mono text-white font-semibold">{currencySymbol}{fmtAmount(extraCharges)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 text-sm font-extrabold">
            <span className="text-amber-200">추정 총 청구액 (Total Estimate)</span>
            <span className="font-mono text-amber-400 text-base font-black">{currencySymbol}{fmtAmount(totalFreight)} {currencyCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
