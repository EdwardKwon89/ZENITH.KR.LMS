import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { AgencyShipperForm } from './shipper-form';

export default async function NewAgencyShipperPage() {
  const { profile } = await requireAuth();
  if (!profile) redirect('/login');
  const t = await getTranslations('AgencyShippers');

  return <AgencyShipperForm agencyOrgId={profile.org_id} t={t} />;
}
