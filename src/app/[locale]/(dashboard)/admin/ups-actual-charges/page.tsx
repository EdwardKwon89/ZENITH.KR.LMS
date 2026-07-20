import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import UpsActualChargesClient from './ups-actual-charges-client';

export default async function UpsActualChargesPage() {
  // 1. 플랫폼 관리자 권한 확인 (ADMIN, MANAGER, ZENITH_SUPER_ADMIN)
  const { profile } = await requireAuth();
  
  const isAllowed = 
    profile?.role === 'ZENITH_SUPER_ADMIN' || 
    profile?.role === 'ADMIN' || 
    profile?.role === 'MANAGER';

  if (!isAllowed) {
    redirect('/');
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100 font-heading tracking-tight">
          UPS 사후 청구 및 차액 정산 관리
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          UPS 배송 완료 건에 대하여 실제 청구 금액을 입력하고 예상 운임과의 차액(조정비용)을 계산하여 정산 파이프라인에 반영합니다.
        </p>
      </div>

      <UpsActualChargesClient />
    </div>
  );
}
