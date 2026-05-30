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
    <ZenCard className="flex flex-col min-h-[320px]">
      <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-4">
        <h3 className="text-lg font-bold text-slate-800">TISA Rate Snapshot</h3>
        {snapshot?.status === 'MANUAL' ? (
          <ZenBadge variant="warning">Manual Override</ZenBadge>
        ) : (
          <ZenBadge variant="success">Auto Matched (자동 매칭)</ZenBadge>
        )}
      </div>

      {snapshot ? (
        <div className="flex-1 flex flex-col gap-3">
          {/* Rate Info: 2-column layout for density */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rate Card ID</span>
              <p className="text-sm text-slate-700 font-medium break-all mt-0.5" title={snapshot.rateCardId}>{snapshot.rateCardId}</p>
            </div>
            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Version (버전)</span>
              <p className="text-sm text-slate-700 font-medium mt-0.5">v{snapshot.versionNo}</p>
            </div>
            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Priority (우선순위)</span>
              <p className="text-sm text-slate-700 font-medium mt-0.5">{snapshot.priority}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Base Amount (기준 운임)</span>
              <p className="text-sm font-bold text-blue-600 mt-0.5">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(snapshot.baseAmount)}
              </p>
            </div>
          </div>

          {/* Validity */}
          <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Validity Period (유효 기간)</span>
            <p className="text-sm text-slate-600 mt-0.5">
              {new Date(snapshot.validFrom).toLocaleDateString()} ~ {snapshot.validTo.startsWith('9999') ? 'Open Ends' : new Date(snapshot.validTo).toLocaleDateString()}
            </p>
          </div>

          {/* Override Reason */}
          {snapshot.status === 'MANUAL' && snapshot.appliedReason && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Override Reason (재정의 사유)</span>
              <p className="text-sm text-amber-900 mt-0.5">{snapshot.appliedReason}</p>
            </div>
          )}

          {/* Auto Match 설명 */}
          <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-neutral-800">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-400">
              Auto Matched: TISA 시스템이 Rate Card를 자동 탐색·매칭하여 스냅샷을 생성했습니다.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-medium">No rate snapshot applied yet.</p>
          <p className="text-[10px] mt-0.5">Order 등록 후 TISA가 자동 매칭합니다.</p>
        </div>
      )}

      <div className="flex justify-end pt-3 mt-3 border-t border-slate-100 dark:border-neutral-800">
        <ZenButton 
          variant="tactile" 
          onClick={() => setIsModalOpen(true)}
          className="text-xs px-3 py-1.5 h-auto"
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
