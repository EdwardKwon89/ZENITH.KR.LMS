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

  const price = estimate.shipper?.finalFreight ?? estimate.platform.totalSellingPrice;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPS 예상 운임</p>
      <p className="text-2xl font-black text-blue-700">
        {price.toLocaleString()}{' '}
        <span className="text-sm font-bold">{estimate.platform.currency}</span>
      </p>
    </div>
  );
}
