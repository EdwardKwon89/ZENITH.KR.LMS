import { requireAuth, checkPermission } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { USER_ROLES } from '@/lib/auth/rbac';
import { hasAdminOrManagerRole } from '@/lib/auth/ups-rate-permissions';
import { getUpsZones, getUpsProducts, getUpsBaseRates, getUpsOtherCharges, getUpsWeightTierRates, getUpsFreightMinimums, getUpsSurgeFees } from '@/app/actions/ups/rates';
import UpsRatesClient from './ups-rates-client';

export default async function UpsRatesPage() {
  const { profile } = await requireAuth();
  if (!profile || !checkPermission(profile.role, '/admin/ups-rates')) redirect('/');

  const isSubAdmin = profile.role === USER_ROLES.SUB_ADMIN;
  const hasFullRateAccess = hasAdminOrManagerRole(profile.role);
  if (!hasFullRateAccess && !isSubAdmin) redirect('/');

  const supabase = await createClient();

  // 기본요율(원가 Matrix)은 SUB_ADMIN까지 허용, 나머지 5종 원가 데이터는 admin 3역할에만 전달한다.
  const [zones, products, baseRates] = await Promise.all([
    getUpsZones(),
    getUpsProducts(),
    getUpsBaseRates(),
  ]);

  const fuelSurcharges = hasFullRateAccess
    ? (await supabase
        .from('zen_ups_fuel_surcharges')
        .select('*, product:product_id(product_code, product_name)')
        .order('effective_week', { ascending: false })).data ?? []
    : [];
  const otherCharges = hasFullRateAccess ? await getUpsOtherCharges() : [];
  const weightTierRates = hasFullRateAccess ? await getUpsWeightTierRates() : [];
  const freightMinimums = hasFullRateAccess ? await getUpsFreightMinimums() : [];
  const surgeFees = hasFullRateAccess ? await getUpsSurgeFees() : [];

  const { data: agencyPolicies } = await supabase
    .from('zen_agency_pricing_policies')
    .select('*, agency:agency_org_id(name), zone:zone_id(zone_code)');

  const { data: orgs } = await supabase
    .from('zen_organizations')
    .select('id, name, volumetric_divisor')
    .eq('type', 'AGENCY')
    .eq('status', 'ACTIVE')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-amber-600 rounded-xl text-white shadow-lg shadow-amber-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">UPS 요율 관리</h1>
          <p className="text-xs font-medium text-slate-500">UPS 특송 기준요금·유류할증·부가요금 및 대리점 할인율 정책을 관리합니다.</p>
        </div>
      </div>
      <UpsRatesClient
        zones={zones}
        products={products}
        baseRates={baseRates}
        fuelSurcharges={fuelSurcharges}
        otherCharges={otherCharges}
        agencyPolicies={agencyPolicies ?? []}
        agencies={orgs ?? []}
        weightTierRates={weightTierRates}
        freightMinimums={freightMinimums}
        surgeFees={surgeFees}
        userRole={profile.role || 'GUEST'}
        restrictToBaseRates={!hasFullRateAccess}
        fetchRates={getUpsBaseRates}
      />
    </div>
  );
}
