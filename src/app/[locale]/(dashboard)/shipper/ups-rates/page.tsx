import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAgencyOrgIdByShipper } from '@/app/actions/agency/shipper-link';
import { getUpsZones, getUpsProducts, getUpsBaseRates, getUpsOtherCharges, getUpsWeightTierRates, getUpsFreightMinimums } from '@/app/actions/ups/rates';
import { ShipperUpsRatesClient } from './shipper-ups-rates-client';

export default async function ShipperUpsRatesPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, '/shipper')) redirect('/');
  const supabase = await createClient();

  const agencyOrgId = await getAgencyOrgIdByShipper(profile.org_id);

  const [zones, products, baseRates, otherCharges, weightTierRates, freightMinimums] = await Promise.all([
    getUpsZones(),
    getUpsProducts(),
    getUpsBaseRates(),
    getUpsOtherCharges(),
    getUpsWeightTierRates(),
    getUpsFreightMinimums(),
  ]);

  const fuelSurchargesResult = await supabase
    .from('zen_ups_fuel_surcharges')
    .select('*, product:product_id(product_code, product_name)')
    .order('effective_week', { ascending: false });

  let globalDiscountRate = 0;
  const zoneDiscountMap: Record<string, number> = {};
  if (agencyOrgId) {
    const { data: shipperInfo } = await supabase
      .from('zen_agency_shippers')
      .select('discount_rate')
      .eq('shipper_org_id', profile.org_id)
      .eq('is_active', true)
      .maybeSingle();
    globalDiscountRate = shipperInfo ? Number(shipperInfo.discount_rate) : 0;

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
        fuelSurcharges={fuelSurchargesResult.data ?? []}
        otherCharges={otherCharges}
        weightTierRates={weightTierRates}
        freightMinimums={freightMinimums}
        globalDiscountRate={globalDiscountRate}
        zoneDiscountMap={zoneDiscountMap}
      />
    </div>
  );
}
