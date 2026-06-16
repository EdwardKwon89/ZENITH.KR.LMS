import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { getAgencyRateOverrides } from '@/app/actions/agency/rate-overrides';
import { RateOverridesClient } from './rate-overrides-client';

export default async function RateOverridesPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, '/agency')) redirect('/');
  const t = await getTranslations();

  const { overrides } = await getAgencyRateOverrides(profile.org_id);

  return <RateOverridesClient overrides={overrides} t={t} />;
}