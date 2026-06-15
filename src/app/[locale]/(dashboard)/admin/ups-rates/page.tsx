import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UpsRatesAdminPage } from '../../../../../components/admin/ups-rates/UpsRatesAdminPage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.ups_rates');
  return {
    title: t('title'),
  };
}

export default function Page() {
  return <UpsRatesAdminPage />;
}
