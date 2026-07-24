'use client';

import React, { useState, useTransition } from 'react';
import { OrderStatus } from '@/types/orders';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Truck,
  ShieldCheck,
  Package,
  Calendar,
  Warehouse,
  Send,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  checkRealtimeUpsTrackingAction,
  manuallySetOrderDeliveredAction,
} from '@/app/actions/operations/tracking';

interface UpsOrderStatusStepperProps {
  orderId: string;
  currentStatus: string;
  trackingNumber?: string | null;
  canManuallySetDelivered?: boolean;
}

const STEPPER_STAGES: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: OrderStatus.REGISTERED, label: '접수등록', icon: Package },
  { status: OrderStatus.SCHEDULED, label: '픽업예정', icon: Calendar },
  { status: OrderStatus.WAREHOUSED, label: '창고입고', icon: Warehouse },
  { status: OrderStatus.PACKED, label: '포장/라벨발급', icon: Package },
  { status: OrderStatus.RELEASED, label: '출고확정', icon: Send },
  { status: OrderStatus.IN_TRANSIT, label: 'UPS 배송중', icon: Truck },
  { status: OrderStatus.DELIVERED, label: '배송완료', icon: CheckCircle2 },
];

export default function UpsOrderStatusStepper({
  orderId,
  currentStatus,
  trackingNumber,
  canManuallySetDelivered = true,
}: UpsOrderStatusStepperProps) {
  const [isPending, startTransition] = useTransition();
  const [isManualPending, startManualTransition] = useTransition();

  // ZenUI Modal state for manual reason input
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualReason, setManualReason] = useState('');

  // Find index of current status
  const currentStepIndex = STEPPER_STAGES.findIndex((s) => s.status === currentStatus);
  const isCanceled = currentStatus === OrderStatus.CANCELED;
  const isHeld = currentStatus === OrderStatus.HELD;

  // Real-time tracking check handler
  const handleCheckRealtimeTracking = () => {
    if (!trackingNumber) {
      toast.error('발급된 활성 UPS 운송장 번호가 없습니다.');
      return;
    }

    startTransition(async () => {
      const res = await checkRealtimeUpsTrackingAction(orderId);
      if (res.success) {
        if (res.statusUpdated) {
          toast.success('UPS 배송 완료(DL) 감지! 오더 상태가 배송완료(DELIVERED)로 자동 전환되었습니다.');
        } else {
          toast.success(`UPS 실시간 배송 확인 완료: ${res.trackStatusName || res.trackStatus || '정상 조회'}`);
        }
      } else {
        toast.error(res.error || '실시간 배송 확인 중 오류 발생');
      }
    });
  };

  // Manual DELIVERED transition handler via ZenUI modal submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualReason.trim()) {
      toast.error('수동 전환 사유를 반드시 입력해야 합니다.');
      return;
    }

    startManualTransition(async () => {
      const res = await manuallySetOrderDeliveredAction(orderId, manualReason.trim());
      if (res.success) {
        toast.success('배송완료(DELIVERED) 상태로 수동 전환되었습니다.');
        setIsModalOpen(false);
        setManualReason('');
      } else {
        toast.error(res.error || '수동 전환 실패');
      }
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col gap-6 w-full">
        {/* Top Header & Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              UPS 오더 진행 상태
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              운영 프로세스 단계별 실시간 상태를 추적합니다.
            </p>
          </div>

          {/* Live Actions */}
          <div className="flex items-center gap-2">
            {/* Real-time Poll Button */}
            <button
              onClick={handleCheckRealtimeTracking}
              disabled={isPending || !trackingNumber}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              title={trackingNumber ? `운송장 번호: ${trackingNumber}` : '운송장 번호 없음'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>실시간 UPS 배송 확인</span>
            </button>

            {/* Manual DELIVERED Button (Agency / Admin) */}
            {canManuallySetDelivered && currentStatus !== OrderStatus.DELIVERED && (
              <button
                onClick={() => {
                  setManualReason('고객 수령 확인 (수동 배송완료 전환)');
                  setIsModalOpen(true);
                }}
                disabled={isManualPending}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>수동 배송완료 전환</span>
              </button>
            )}
          </div>
        </div>

        {/* Exception Status Alert (CANCELED / HELD) */}
        {isCanceled && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>본 오더는 현재 <strong className="font-bold">취소(CANCELED)</strong> 처리되었습니다.</span>
          </div>
        )}

        {isHeld && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>본 오더는 현재 <strong className="font-bold">보류(HELD)</strong> 상태입니다. 사유 해제 후 진행됩니다.</span>
          </div>
        )}

        {/* 7-Stage Stepper UI */}
        {!isCanceled && (
          <div className="w-full py-2">
            <div className="grid grid-cols-7 gap-2 relative">
              {STEPPER_STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isCompleted = currentStepIndex >= 0 && idx < currentStepIndex;
                const isCurrent = currentStepIndex >= 0 && idx === currentStepIndex;

                return (
                  <div key={stage.status} className="flex flex-col items-center gap-2 text-center group">
                    {/* Step Icon Circle */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-md animate-pulse'
                          : 'bg-slate-100 dark:bg-zinc-900 text-slate-400 border border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    {/* Step Label */}
                    <span
                      className={`text-[11px] font-bold tracking-tight transition-colors ${
                        isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isCurrent
                          ? 'text-amber-600 dark:text-amber-400 font-extrabold scale-105'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {stage.label}
                    </span>

                    {/* Step Indicator Dot / Line */}
                    <div className="w-full flex items-center justify-center gap-1 mt-1">
                      <span
                        className={`h-1 rounded-full w-full ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isCurrent
                            ? 'bg-amber-500'
                            : 'bg-slate-200 dark:bg-zinc-800'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manual DELIVERED Reason ZenUI Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  수동 배송 완료(DELIVERED) 전환
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                선택한 오더를 <strong className="text-amber-600 dark:text-amber-400">배송 완료(DELIVERED)</strong> 상태로 수동 전환합니다. 전환 사유를 작성해주세요 (필수 입력).
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>수동 전환 사유</span>
                </label>
                <textarea
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="예: 실시간 트래킹 지연으로 대리점 담당자가 수령인 전화 확인 완료"
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[90px] text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isManualPending}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  {isManualPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>배송 완료로 전환</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
