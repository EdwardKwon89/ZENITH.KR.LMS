'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Send, CheckCircle, XCircle, AlertCircle, FileText, Plus, Loader2 } from 'lucide-react';
import { customsDeclarationSchema, CustomsDeclarationInput, customsStatusUpdateSchema, CustomsStatusUpdateInput } from '@/lib/validation/customs';
import { createDeclaration, submitDeclaration, updateDeclarationStatus } from '@/app/actions/customs';
import { CustomsDeclaration } from '@/lib/customs/types';
import { toast } from 'sonner';

interface OrderCustomsAdminControlProps {
  orderId: string;
  declaration: CustomsDeclaration | null;
}

/**
 * [Admin] Customs Control Panel
 * 관리자가 통관 신고를 생성하고 제출 및 상태를 관리하는 제어판
 */
export default function OrderCustomsAdminControl({ orderId, declaration }: OrderCustomsAdminControlProps) {
  const [isPending, setIsPending] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 1. 신고 생성 폼
  const {
    register: regCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<CustomsDeclarationInput>({
    resolver: zodResolver(customsDeclarationSchema),
    defaultValues: {
      currencyCode: 'USD',
    },
  });

  // 2. 상태 업데이트 폼
  const {
    register: regUpdate,
    handleSubmit: handleUpdateSubmit,
    setValue: setUpdateValue,
    formState: { errors: errorsUpdate },
  } = useForm<CustomsStatusUpdateInput>({
    resolver: zodResolver(customsStatusUpdateSchema),
  });

  // 신고 생성 처리
  const onCreate = async (data: CustomsDeclarationInput) => {
    setIsPending(true);
    try {
      const { data: decId, error } = await createDeclaration({
        orderId,
        cargoDescription: data.cargoDescription,
        declaredValue: data.declaredValue,
        currencyCode: data.currencyCode,
      });
      if (error) {
        toast.error(error || '생성 실패');
      } else {
        toast.success('통관 신고가 생성되었습니다.');
        setShowCreateForm(false);
        resetCreate();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPending(false);
    }
  };

  // 신고 제출 처리
  const onSubmit = async () => {
    if (!declaration) return;
    setIsPending(true);
    try {
      const { data: success, error } = await submitDeclaration(declaration.id);
      if (error) {
        toast.error(error || '제출 실패');
      } else {
        toast.success('관세청에 신고가 제출되었습니다.');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPending(false);
    }
  };

  // 상태 업데이트 처리 (Approve, Reject, etc.)
  const onUpdateStatus = async (status: string, adminNote?: string) => {
    if (!declaration) return;
    setIsPending(true);
    try {
      const { data: success, error } = await updateDeclarationStatus({
        id: declaration.id,
        status: status as any,
        adminNote,
      });
      if (error) {
        toast.error(error || '업데이트 실패');
      } else {
        toast.success(`통관 상태가 ${status}로 변경되었습니다.`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-500" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">통관 행정 제어 (Admin)</h3>
      </div>

      <div className="p-5">
        {!declaration ? (
          // 신고서가 없을 때
          !showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-2xl text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all group"
            >
              <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">새 통관 신고서 생성</span>
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit(onCreate)} className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Cargo Description</label>
                <input
                  {...regCreate('cargoDescription')}
                  placeholder="물품 명세 (예: Electronic Parts)"
                  className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errorsCreate.cargoDescription && <p className="text-[10px] text-red-500">{errorsCreate.cargoDescription.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Declared Value</label>
                  <input
                    type="number"
                    {...regCreate('declaredValue', { valueAsNumber: true })}
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {errorsCreate.declaredValue && <p className="text-[10px] text-red-500">{errorsCreate.declaredValue.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Currency</label>
                  <select
                    {...regCreate('currencyCode')}
                    className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-sm p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="KRW">KRW</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  취소
                </button>
                <button
                  disabled={isPending}
                  className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '신고서 초안 생성'}
                </button>
              </div>
            </form>
          )
        ) : (
          // 신고서가 존재할 때
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Phase</p>
                <p className="text-lg font-black text-slate-900 dark:text-white uppercase">{declaration.status}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-neutral-800 flex items-center justify-center border border-slate-100 dark:border-neutral-700">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* Actions based on status */}
            <div className="grid grid-cols-1 gap-3">
              {declaration.status === 'PENDING' && (
                <button
                  onClick={onSubmit}
                  disabled={isPending}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/10"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> 관세청 신고 제출 (Submit)</>}
                </button>
              )}

              {declaration.status === 'SUBMITTED' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onUpdateStatus('APPROVED', '통관 승인되었습니다.')}
                    disabled={isPending}
                    className="py-3 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> 승인 (Approve)</>}
                  </button>
                  <button
                    onClick={() => onUpdateStatus('REJECTED', '서류 미비로 반려되었습니다.')}
                    disabled={isPending}
                    className="py-3 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> 반려 (Reject)</>}
                  </button>
                </div>
              )}

              {['APPROVED', 'REJECTED', 'HELD'].includes(declaration.status) && (
                <p className="text-xs text-center text-slate-400 py-2 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                  최종 상태에 도달했습니다. 추가 조작이 필요하면 DB 수정을 권장합니다.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
        <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-tight">
          <strong>관리자 안내:</strong> 이 패널은 통관 프로세스의 각 단계를 강제로 트리거합니다. 제출 시 ManualAdapter가 신고번호를 자동 생성하며, 승인 시 화주에게 알림이 발송될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
