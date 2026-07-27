import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { getOrganizations } from '@/app/actions/master';
import OrderRevenueCostClient from './order-revenue-cost-client';

export default async function OrderRevenueCostPage() {
  const { profile } = await requireAuth();

  const isAdminOrManager = [
    'ZENITH_SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
  ].includes(profile?.role || '');

  const orgs = isAdminOrManager ? await getOrganizations() : [];
  const agencies = (orgs || []).filter((o: any) => o.type === 'AGENCY');

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100 font-heading tracking-tight">
          오더별 매출/매입 및 정산 마진 현황
        </h1>
        <p className="text-slate-500 dark:text-zinc-400">
          오더별 실제 매출(화주 청구액)과 매입(원가)을 실시간 비교하여 정산 수익성 및 순 마진율을 관리합니다.
        </p>
      </div>

      <OrderRevenueCostClient
        isAdminOrManager={isAdminOrManager}
        agencies={agencies.map((a: any) => ({ id: a.id, name: a.name }))}
      />
    </div>
  );
}
