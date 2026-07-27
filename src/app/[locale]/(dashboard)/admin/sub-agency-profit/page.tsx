import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import SubAgencyProfitClient from './sub-agency-profit-client';

export default async function SubAgencyProfitPage() {
  const { profile } = await requireAuth();

  const isAllowed = [
    'ZENITH_SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'SUB_ADMIN',
  ].includes(profile?.role || '');

  if (!isAllowed) {
    redirect('/');
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100 font-heading tracking-tight">
          SNTL 수익금 및 Sub-Agency 마진 집계
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          Sub-Agency별 SNTL 매출(Sub-Agency 납입 총액)과 매입(실제 UPS 원가)을 비교하여 SNTL 순수익금을 집계합니다.
        </p>
      </div>

      <SubAgencyProfitClient />
    </div>
  );
}
