import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { getAgencyUpsRatesData } from '@/app/actions/agency/ups-rates';
import { getTranslations } from 'next-intl/server';
import AgencyUpsRatesClient from './agency-ups-rates-client';

export default async function AgencyUpsRatesPage() {
  const { profile } = await requireAuth();
  if (!profile || !checkPermission(profile.role, '/agency')) {
    return <div className="p-8 text-red-500">Access denied</div>;
  }

  const t = await getTranslations('Navigation');
  const data = await getAgencyUpsRatesData();

  return <AgencyUpsRatesClient data={data} t_rates={t('ups_rates')} />;
}
