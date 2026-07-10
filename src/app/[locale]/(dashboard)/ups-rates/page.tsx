import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { getShipperUpsRatesData } from '@/app/actions/shipper/ups-rates';
import { getTranslations } from 'next-intl/server';
import ShipperUpsRatesClient from './shipper-ups-rates-client';

export default async function UpsRatesPage() {
  const { profile } = await requireAuth();
  if (!profile || !checkPermission(profile.role, '/ups-rates')) {
    return <div className="p-8 text-red-500">Access denied</div>;
  }

  const t = await getTranslations('Navigation');
  const data = await getShipperUpsRatesData();

  return <ShipperUpsRatesClient data={data} />;
}
