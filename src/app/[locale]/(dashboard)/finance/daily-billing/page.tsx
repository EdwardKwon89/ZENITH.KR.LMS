import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { checkPermission } from '@/lib/auth/rbac';
import { getShipperDailyBillingSummary } from '@/app/actions/finance/daily-billing';
import ShipperDailyBillingClient from '@/components/finance/ShipperDailyBillingClient';
import { FileText, ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function DailyBillingPage() {
  const { profile } = await requireAuth();

  // Access check: Admin, Manager, Zenith Super Admin, or Agency
  const allowedRoles = ['ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENCY'];
  if (!allowedRoles.includes(profile?.role || '')) {
    redirect('/dashboard');
  }

  const result = await getShipperDailyBillingSummary();
  const groups = result.groups || [];
  const exchangeRate = result.exchangeRate || 1350;

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              최종 운임 확정 및 화주별 일별 청구 집계 (W2)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              UPS 발송 기준 오더의 최종 정산 마감 상태 및 화주별/일자별 합산 운임 집계를 관리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Main Client UI */}
      <ShipperDailyBillingClient initialGroups={groups} exchangeRate={exchangeRate} />
    </div>
  );
}
