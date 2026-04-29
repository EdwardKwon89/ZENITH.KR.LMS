import React from 'react';
import { getClaims } from '@/app/actions/claims';
import { ClaimManagementTable } from '@/components/admin/claims/ClaimManagementTable';
import { ZenAurora } from '@/components/ui/ZenUI';

export const dynamic = 'force-dynamic';

export default async function AdminClaimsPage() {
  const claims = await getClaims();

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight font-heading">
            Claims Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            사고 관리 및 정산 차감 프로세스
          </p>
        </div>
      </div>

      <ClaimManagementTable initialClaims={claims} />
    </div>
  );
}
