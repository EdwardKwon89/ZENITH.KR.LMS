import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAgencyOrgIdByShipper } from '@/app/actions/agency/shipper-link';
import { getUpsZones, getUpsProducts } from '@/app/actions/ups/rates';
import { getPublicBaseRates, getPublicFuelSurcharges, getPublicOtherCharges, getPublicWeightTierRates, getPublicFreightMinimums, getPublicSurgeFees } from '@/app/actions/ups/rates-public';
import { ShipperUpsRatesClient } from './shipper-ups-rates-client';

export default async function ShipperUpsRatesPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, '/shipper')) redirect('/');
  const supabase = await createClient();

  const agencyOrgId = await getAgencyOrgIdByShipper(profile.org_id);

  const [zones, products, baseRates, fuelSurcharges, otherCharges, weightTierRates, freightMinimums, surgeFees] = await Promise.all([
    getUpsZones(),
    getUpsProducts(),
    getPublicBaseRates(),
    getPublicFuelSurcharges(),
    getPublicOtherCharges(),
    getPublicWeightTierRates(),
    getPublicFreightMinimums(),
    getPublicSurgeFees(),
  ]);

  const zoneDiscountMap: Record<string, number> = {};
  if (agencyOrgId) {
    const { data: zoneDiscounts } = await supabase
      .from('zen_agency_shipper_zone_discounts')
      .select('zone_id, discount_rate')
      .eq('shipper_org_id', profile.org_id)
      .eq('is_active', true);
    if (zoneDiscounts) {
      for (const zd of zoneDiscounts) zoneDiscountMap[zd.zone_id] = Number(zd.discount_rate);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-black text-slate-900">UPS 운임 조회</h1>
        <p className="text-xs text-slate-500 mt-1">화주님께 적용되는 UPS 운임 정보를 조회합니다.</p>
      </div>
      <ShipperUpsRatesClient
        zones={zones}
        products={products}
        baseRates={baseRates}
        fuelSurcharges={fuelSurcharges}
        otherCharges={otherCharges}
        weightTierRates={weightTierRates}
        freightMinimums={freightMinimums}
        surgeFees={surgeFees}
        zoneDiscountMap={zoneDiscountMap}
      />
    </div>
  );
}
