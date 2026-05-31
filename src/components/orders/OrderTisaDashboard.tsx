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
  carrierCostAmount?: number;
  platformFeeAmount?: number;
}

interface OrderTisaDashboardProps {
  orderId: string;
  snapshot: TisaSnapshot | null;
  isAdminView?: boolean;
  onOverrideSubmit?: (data: any) => Promise<void>;
}

export const OrderTisaDashboard: React.FC<OrderTisaDashboardProps> = ({ 
  orderId, 
  snapshot,
  isAdminView = false,
  onOverrideSubmit
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ZenCard className="flex flex-col min-h-[320px]">
      <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-4">
        <h3 className="text-lg font-bold text-slate-800">TISA Rate Snapshot</h3>
        {isAdminView && snapshot?.status === 'MANUAL' ? (
          <ZenBadge variant="warning">Manual Override</ZenBadge>
        ) : isAdminView ? (
          <ZenBadge variant="success">Auto Matched (자동 매칭)</ZenBadge>
        ) : null}
      </div>

      {snapshot ? (
        <div className="flex-1 flex flex-col gap-3">
          {/* Rate Info: 2-column layout for density */}
          <div className="grid grid-cols-2 gap-3">
            {isAdminView && (
              <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rate Card ID</span>
                <p className="text-sm text-slate-700 font-medium break-all mt-0.5" title={snapshot.rateCardId}>{snapshot.rateCardId}</p>
              </div>
            )}
            {isAdminView && (
              <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Version (버전)</span>
                <p className="text-sm text-slate-700 font-medium mt-0.5">v{snapshot.versionNo}</p>
              </div>
            )}
            {isAdminView && (
              <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Priority (우선순위)</span>
                <p className="text-sm text-slate-700 font-medium mt-0.5">{snapshot.priority}</p>
              </div>
            )}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Base Amount (기준 운임)</span>
              <p className="text-sm font-bold text-blue-600 mt-0.5">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(snapshot.baseAmount)}
              </p>
            </div>
          </div>

          {/* Cost Breakdown (Admin only) */}
          {isAdminView && snapshot.carrierCostAmount != null && snapshot.platformFeeAmount != null && (
            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cost Breakdown (원가 구조)</span>
              <div className="flex flex-col gap-1 mt-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Carrier Cost (운송사 원가)</span>
                  <span className="font-mono font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(snapshot.carrierCostAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Platform Fee (플랫폼 수수료)</span>
                  <span className="font-mono font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(snapshot.platformFeeAmount)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold text-slate-800">
                  <span>Total (합계)</span>
                  <span className="font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: snapshot.currency }).format(snapshot.baseAmount + snapshot.platformFeeAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validity (Admin only) */}
          {isAdminView && (
            <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Validity Period (유효 기간)</span>
              <p className="text-sm text-slate-600 mt-0.5">
                {new Date(snapshot.validFrom).toLocaleDateString()} ~ {snapshot.validTo.startsWith('9999') ? 'Open Ends' : new Date(snapshot.validTo).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Override Reason (Admin only) */}
          {isAdminView && snapshot.status === 'MANUAL' && snapshot.appliedReason && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Override Reason (재정의 사유)</span>
              <p className="text-sm text-amber-900 mt-0.5">{snapshot.appliedReason}</p>
            </div>
          )}

          {/* Auto Match 설명 (Admin only) */}
          {isAdminView && (<div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-neutral-800">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-400">
              Auto Matched: TISA 시스템이 Rate Card를 자동 탐색·매칭하여 스냅샷을 생성했습니다.
            </span>
          </div>)}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-medium">No rate snapshot applied yet.</p>
          <p className="text-[10px] mt-0.5">경로 최적화를 완료하면 요율이 자동으로 매칭됩니다.</p>
        </div>
      )}

      {isAdminView && (
        <div className="flex justify-end pt-3 mt-3 border-t border-slate-100 dark:border-neutral-800">
          <ZenButton 
            variant="tactile" 
            onClick={() => setIsModalOpen(true)}
            className="text-xs px-3 py-1.5 h-auto"
          >
            Override Rate
          </ZenButton>
        </div>
      )}

      <OverrideRateModal 
        isOpen={isModalOpen && isAdminView} 
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
