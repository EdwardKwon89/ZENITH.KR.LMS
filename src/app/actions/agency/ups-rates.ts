'use server';

import { createClient } from '@/utils/supabase/server';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import type {
  UpsZoneWithCountries,
  UpsProduct,
  UpsBaseRateWithRefs,
  UpsFuelSurcharge,
  UpsOtherCharge,
  UpsWeightTierRateWithRefs,
  UpsFreightMinimumWithRefs,
} from '@/types/ups';

export interface AgencyBaseRateRow extends UpsBaseRateWithRefs {
  agency_cost_price: number;
  has_override: boolean;
  override_selling_price: number | null;
  override_cost_price: number | null;
}

export interface AgencyUpsRatesData {
  zones: UpsZoneWithCountries[];
  products: UpsProduct[];
  baseRates: UpsBaseRateWithRefs[];
  weightTierRates: UpsWeightTierRateWithRefs[];
  fuelSurcharge: UpsFuelSurcharge | null;
  otherCharges: UpsOtherCharge[];
  freightMinimums: UpsFreightMinimumWithRefs[];
  discountRate: number;
  agencyOrgId: string;
  agencyName: string;
}

export async function getAgencyUpsRatesData(): Promise<AgencyUpsRatesData> {
  const { supabase, profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const agencyOrgId = profile.org_id;
  if (!agencyOrgId) throw new Error('Agency org ID not found');

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', agencyOrgId)
    .single();
  const agencyName = org?.name ?? 'Agency';

  const { data: policy } = await supabase
    .from('zen_agency_pricing_policies')
    .select('discount_rate')
    .eq('agency_org_id', agencyOrgId)
    .maybeSingle();
  const discountRate = policy?.discount_rate ?? 0;

  const refDate = new Date().toISOString().split('T')[0];

  const [zones, products, baseRates, weightTierRates, fuelSurcharge, otherCharges, freightMinimums] = await Promise.all([
    supabase.from('zen_ups_zones').select('*, countries:zen_ups_zone_countries(*)').eq('is_active', true).order('sort_order').then(r => r.data ?? []),
    supabase.from('zen_ups_products').select('*').eq('is_active', true).order('sort_order').then(r => r.data ?? []),
    supabase.from('zen_ups_base_rates')
      .select('*, product:product_id(product_code, product_name, cargo_type), zone:zone_id(zone_code, zone_name)')
      .eq('is_active', true)
      .lte('valid_from', refDate)
      .or(`valid_until.is.null,valid_until.gte.${refDate}`)
      .order('weight_kg').then(r => r.data ?? []),
    supabase.from('zen_ups_weight_tier_rates')
      .select('*, product:product_id(product_code, product_name), zone:zone_id(zone_code, zone_name)')
      .eq('is_active', true)
      .order('tier_min_kg').then(r => r.data ?? []),
    supabase.from('zen_ups_fuel_surcharges')
      .select('*')
      .lte('effective_week', refDate)
      .order('effective_week', { ascending: false }).limit(1).then(r => r.data?.[0] ?? null),
    supabase.from('zen_ups_other_charges').select('*').eq('is_active', true).order('charge_code').then(r => r.data ?? []),
    supabase.from('zen_ups_freight_minimums')
      .select('*, product:product_id(product_code, product_name), zone:zone_id(zone_code, zone_name)')
      .eq('is_active', true).then(r => r.data ?? []),
  ]);

  return {
    zones: zones as UpsZoneWithCountries[],
    products: products as UpsProduct[],
    baseRates: baseRates as UpsBaseRateWithRefs[],
    weightTierRates: weightTierRates as UpsWeightTierRateWithRefs[],
    fuelSurcharge: fuelSurcharge as UpsFuelSurcharge | null,
    otherCharges: otherCharges as UpsOtherCharge[],
    freightMinimums: freightMinimums as UpsFreightMinimumWithRefs[],
    discountRate,
    agencyOrgId,
    agencyName,
  };
}
