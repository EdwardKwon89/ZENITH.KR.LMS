import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { getAgencyShippers } from '@/app/actions/agency/shippers';
import { AgencyShippersClient } from './shippers-client';

export default async function AgencyShippersPage() {
  const { profile } = await requireAuth();
  if (!profile) redirect('/login');
  const t = await getTranslations('AgencyShippers');

  const { shippers } = await getAgencyShippers(profile.org_id);

  return <AgencyShippersClient shippers={shippers} t={t} />;
}
