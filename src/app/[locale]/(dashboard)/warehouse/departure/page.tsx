import React from 'react';
import { requireAuth } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { redirect } from 'next/navigation';
import DepartureConfirmForm from '@/components/warehouse/DepartureConfirmForm';

/**
 * [E28 RBAC Audit] 2026-07-23 B_Kai
 * pickup/inbound/outbound 페이지와 동일한 isAllowed 역할 체크 추가.
 * 이전에는 requireAuth()만 호출하여 인증된 모든 사용자가 접근 가능했으나,
 * STATIC_PERMISSIONS와 페이지 권한이 불일치했음.
 * 수정 후: ADMIN/MANAGER/ZENITH_SUPER_ADMIN/AGENCY만 접근 가능.
 */
export default async function DeparturePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { profile } = await requireAuth();

  const isAllowed = profile?.role === USER_ROLES.ADMIN ||
    profile?.role === USER_ROLES.MANAGER ||
    profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN ||
    profile?.role === USER_ROLES.AGENCY;

  if (!isAllowed) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <DepartureConfirmForm locale={locale} />
    </div>
  );
}
