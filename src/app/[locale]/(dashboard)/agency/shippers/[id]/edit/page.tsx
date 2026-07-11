import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { getAgencyShipperById } from '@/app/actions/agency/shippers';
import { getUpsZones } from '@/app/actions/ups/rates';
import { EditShipperForm } from './edit-form';

export default async function EditAgencyShipperPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id) redirect('/');

  const { id } = await props.params;
  const { shipper } = await getAgencyShipperById(id);
  const zones = await getUpsZones();

  return <EditShipperForm shipper={shipper as any} zones={zones as any} />;
}
