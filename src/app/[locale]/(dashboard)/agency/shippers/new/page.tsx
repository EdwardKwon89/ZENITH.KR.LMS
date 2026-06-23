import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { AgencyShipperForm } from './shipper-form';

export default async function NewAgencyShipperPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id) redirect('/');

  return <AgencyShipperForm agencyOrgId={profile.org_id} />;
}
