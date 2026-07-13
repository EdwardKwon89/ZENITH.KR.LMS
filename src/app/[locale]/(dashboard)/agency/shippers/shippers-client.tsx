'use client';

import { useTranslations } from 'next-intl';
import type { AgencyShipperRow } from '@/types/agency';
import { ShippersHeader } from './shippers-header';
import { ShipperTable } from './shipper-table';

interface AgencyShippersClientProps {
  shippers: AgencyShipperRow[];
}

export function AgencyShippersClient({ shippers }: AgencyShippersClientProps) {
  const t = useTranslations('AgencyShippers');

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen animate-in fade-in duration-500">
      <ShippersHeader t={t} />
      <ShipperTable shippers={shippers} t={t} />
    </div>
  );
}
