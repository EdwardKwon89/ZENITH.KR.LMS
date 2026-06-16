import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { getUpsBaseRates } from '@/app/actions/ups/rates';
import { RateOverrideForm } from './rate-override-form';

export default async function NewRateOverridePage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, '/agency')) redirect('/');
  const t = await getTranslations();

  const baseRates = await getUpsBaseRates();

  return <RateOverrideForm agencyOrgId={profile.org_id} baseRates={baseRates} t={t} />;
}