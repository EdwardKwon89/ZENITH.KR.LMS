import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAgencyOtherCharges } from '@/app/actions/agency/other-charges';
import { getUpsOtherCharges } from '@/app/actions/ups/rates';
import { AgencyOtherChargesClient } from './agency-other-charges-client';

export default async function AgencyOtherChargesPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, '/agency')) redirect('/');

  const [charges, allOtherCharges] = await Promise.all([
    getAgencyOtherCharges(profile.org_id),
    getUpsOtherCharges(),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-black text-slate-900">부가요금 관리</h1>
        <p className="text-xs text-slate-500 mt-1">공통 부가요금 코드별 대리점 자체 금액을 등록/관리합니다.</p>
      </div>
      <AgencyOtherChargesClient
        charges={charges}
        allOtherCharges={allOtherCharges}
        agencyOrgId={profile.org_id}
      />
    </div>
  );
}
