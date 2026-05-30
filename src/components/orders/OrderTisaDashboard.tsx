"use client";

import React, { useState, useEffect } from 'react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/ZenUI';
import { OverrideRateModal } from './OverrideRateModal';

// Types (Mock structures matching TISA Architecture)
interface TisaSnapshot {
  id: string;
  orderId: string;
  rateCardId: string;
  versionNo: number;
  status: 'AUTO' | 'MANUAL';
  priority: number;
  baseAmount: number;
  currency: string;
  appliedReason?: string;
  validFrom: string;
  validTo: string;
}

interface OrderTisaDashboardProps {
  orderId: string;
  snapshot: TisaSnapshot | null;
  onOverrideSubmit?: (data: any) => Promise<void>;
}

export const OrderTisaDashboard: React.FC<OrderTisaDashboardProps> = ({ 
  orderId, 
  snapshot,
  onOverrideSubmit
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ZenCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/20 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">TISA Rate Snapshot</h3>
          <p className="text-sm text-slate-500">Temporal Invariant Snapshot Architecture</p>
        </div>
        {snapshot?.status === 'MANUAL' ? (
          <ZenBadge variant="warning">Manual Override</ZenBadge>
        ) : (
          <ZenBadge variant="success">Auto Matched</ZenBadge>
        )}
      </div>

      {snapshot ? (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" title="Rate Card 고유 식별자">Rate Card ID</span>
            <span className="text-sm text-slate-700 font-medium break-all" title={snapshot.rateCardId}>{snapshot.rateCardId}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" title="Rate Card 개정 버전">Version (버전)</span>
            <span className="text-sm text-slate-700 font-medium tracking-tight">v{snapshot.versionNo}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" title="적용 우선순위 (낮을수록 우선)">Priority Level (우선순위)</span>
            <span className="text-sm text-slate-700 font-medium">{snapshot.priority}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" title="기준 운임 금액">Base Amount (기준 운임)</span>
            <span className="text-sm font-bold text-blue-600">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(snapshot.baseAmount)}
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider" title="요율 유효 기간">Validity Period (유효 기간)</span>
            <p className="text-sm text-slate-600 mt-1">
              {new Date(snapshot.validFrom).toLocaleDateString()} ~ {snapshot.validTo.startsWith('9999') ? 'Open Ends' : new Date(snapshot.validTo).toLocaleDateString()}
            </p>
          </div>

          {snapshot.status === 'MANUAL' && snapshot.appliedReason && (
            <div className="flex flex-col gap-1 mt-2 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider" title="Manual Override 사유">Override Reason (재정의 사유)</span>
              <p className="text-sm text-amber-900 mt-1">{snapshot.appliedReason}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 flex text-center flex-col items-center justify-center text-slate-500">
          <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No rate snapshot applied to this order yet.</p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-white/20 mt-2">
        <ZenButton 
          variant="tactile" 
          onClick={() => setIsModalOpen(true)}
          className="text-sm px-4 py-2"
        >
          Override Rate
        </ZenButton>
      </div>

      <OverrideRateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        orderId={orderId}
        currentSnapshot={snapshot}
        onSubmit={async (data) => {
          if (onOverrideSubmit) await onOverrideSubmit(data);
          setIsModalOpen(false);
        }}
      />
    </ZenCard>
  );
};
