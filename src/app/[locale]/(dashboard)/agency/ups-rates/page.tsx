import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUpsZones, getUpsProducts, getUpsBaseRates, getUpsOtherCharges, getUpsWeightTierRates, getUpsFreightMinimums } from '@/app/actions/ups/rates';
import { AgencyUpsRatesClient } from './agency-ups-rates-client';

export default async function AgencyUpsRatesPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, '/agency')) redirect('/');
  const supabase = await createClient();

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

  const { data: pricingPolicies } = await supabase
    .from('zen_agency_pricing_policies')
    .select('*')
    .eq('agency_org_id', profile.org_id)
    .eq('is_active', true);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-black text-slate-900">UPS 요율 조회</h1>
        <p className="text-xs text-slate-500 mt-1">대리점에 적용되는 UPS 기준요금·유류할증·부가요금 정보를 조회합니다.</p>
      </div>
      <AgencyUpsRatesClient
        zones={zones}
        products={products}
        baseRates={baseRates}
        fuelSurcharges={fuelSurchargesResult.data ?? []}
        otherCharges={otherCharges}
        weightTierRates={weightTierRates}
        freightMinimums={freightMinimums}
        pricingPolicies={pricingPolicies ?? []}
        agencyOrgId={profile.org_id}
      />
    </div>
  );
}
