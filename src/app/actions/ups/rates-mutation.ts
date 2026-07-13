'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { getMaxAllowedZoneDiscount } from '@/lib/ups/discount-guard';

function requireAdminOrManager(role: string | undefined) {
  if (!role || (role !== USER_ROLES.ADMIN && role !== USER_ROLES.MANAGER && role !== USER_ROLES.ZENITH_SUPER_ADMIN)) {
    throw new Error('UPS 요율 관리 권한이 없습니다.');
  }
}

// ─── Zone ──────────────────────────────────────────

export async function createUpsZone(data: {
  zone_code: string; zone_name: string; description?: string; sort_order?: number;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_zones').insert({ ...data, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function updateUpsZone(id: string, data: {
  zone_code?: string; zone_name?: string; description?: string; sort_order?: number; is_active?: boolean;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_zones').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function deleteUpsZone(id: string) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_zones').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Zone Countries ────────────────────────────────

export async function addZoneCountry(zoneId: string, countryCode: string, productFamily: string = 'EXPRESS', direction: string = 'EXPORT') {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const pf = productFamily.toUpperCase();
  const dir = direction.toUpperCase();
  if (!['EXPRESS','SAVER','EXPEDITED','FREIGHT'].includes(pf)) throw new Error('Invalid product_family');
  if (!['EXPORT','IMPORT'].includes(dir)) throw new Error('Invalid direction');
  const { error } = await supabase.from('zen_ups_zone_countries').insert({
    zone_id: zoneId, country_code: countryCode.toUpperCase(),
    product_family: pf, direction: dir,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function removeZoneCountry(id: string) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_zone_countries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Product ───────────────────────────────────────

export async function createUpsProduct(data: {
  product_code: string; sub_code?: string; product_name: string;
  cargo_type: 'DOC' | 'NON_DOC' | 'BOTH';
  ddu_available?: boolean; ddp_available?: boolean; sort_order?: number;
  max_weight_kg?: number | null;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_products').insert({ ...data, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function updateUpsProduct(id: string, data: {
  product_code?: string; sub_code?: string; product_name?: string;
  cargo_type?: 'DOC' | 'NON_DOC' | 'BOTH';
  ddu_available?: boolean; ddp_available?: boolean; is_active?: boolean; sort_order?: number;
  max_weight_kg?: number | null;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Base Rate ─────────────────────────────────────

export async function upsertUpsBaseRate(data: {
  product_id: string; zone_id: string; weight_kg: number;
  selling_price: number; cost_price: number; currency?: string;
  valid_from: string; valid_until?: string | null;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_base_rates').upsert({
    ...data, currency: data.currency ?? 'KRW', updated_at: new Date().toISOString(),
  }, { onConflict: 'product_id,zone_id,weight_kg,valid_from' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Fuel Surcharge ────────────────────────────────

export async function upsertUpsFuelSurcharge(data: {
  product_id?: string | null; effective_week: string;
  selling_rate: number; cost_rate: number;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_fuel_surcharges').upsert(data, {
    onConflict: 'product_id,effective_week',
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Other Charge ──────────────────────────────────

export async function createUpsOtherCharge(data: {
  charge_code: string; charge_name: string; unit: string;
  fuel_surcharge_applicable?: boolean;
  selling_price?: number; cost_price?: number; currency?: string;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_other_charges').insert({
    ...data, currency: data.currency ?? 'KRW', updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function updateUpsOtherCharge(id: string, data: {
  charge_code?: string; charge_name?: string; unit?: string;
  fuel_surcharge_applicable?: boolean;
  selling_price?: number | null; cost_price?: number | null;
  currency?: string; is_active?: boolean;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_other_charges').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function deleteUpsOtherCharge(id: string) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_other_charges').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Agency Pricing Policy ─────────────────────────

export async function getAgencyPricingPolicies(agencyOrgId?: string) {
  const { supabase } = await validateUserAction();
  let query = supabase
    .from('zen_agency_pricing_policies')
    .select('*, agency:agency_org_id(name), zone:zone_id(zone_code, zone_name)')
    .eq('is_active', true);
  if (agencyOrgId) query = query.eq('agency_org_id', agencyOrgId);
  const { data, error } = await query.order('agency_org_id');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertAgencyPricingPolicy(data: {
  agency_org_id: string; zone_id: string; discount_rate: number; is_active?: boolean;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);

  const maxAllowed = await getMaxAllowedZoneDiscount(supabase, data.zone_id);
  if (maxAllowed != null && data.discount_rate > maxAllowed) {
    throw new Error(
      `할인율이 원가 마진을 초과합니다. 최대 허용: ${(maxAllowed * 100).toFixed(1)}% (Zone ID: ${data.zone_id})`
    );
  }

  const { error } = await supabase.from('zen_agency_pricing_policies').upsert(data, {
    onConflict: 'agency_org_id,zone_id',
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Weight Tier Rate ──────────────────────────────

export async function upsertUpsWeightTierRate(data: {
  id?: string;
  product_id: string;
  zone_id: string;
  tier_min_kg: number;
  tier_max_kg?: number | null;
  price_per_kg_selling: number;
  price_per_kg_cost: number;
  currency?: string;
  valid_from: string;
  valid_until?: string | null;
  is_active?: boolean;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_weight_tier_rates').upsert({
    ...data,
    currency: data.currency ?? 'KRW',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'product_id,zone_id,tier_min_kg,valid_from' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function deleteUpsWeightTierRate(id: string) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase
    .from('zen_ups_weight_tier_rates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Freight Minimum ───────────────────────────────

export async function upsertUpsFreightMinimum(data: {
  id?: string;
  zone_id: string;
  product_id: string;
  min_charge_selling: number;
  min_charge_cost: number;
  currency?: string;
  is_active?: boolean;
}) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase.from('zen_ups_freight_minimums').upsert({
    ...data,
    currency: data.currency ?? 'KRW',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'product_id,zone_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

export async function deleteUpsFreightMinimum(id: string) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase
    .from('zen_ups_freight_minimums')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
}

// ─── Issue #312: Agency Volumetric Divisor ───────────────

export async function updateAgencyVolumetricDivisor(
  agencyOrgId: string,
  volumetricDivisor: 5000 | 5500 | 6000
) {
  const { supabase, profile } = await validateUserAction();
  requireAdminOrManager(profile?.role);
  const { error } = await supabase
    .from('zen_organizations')
    .update({ volumetric_divisor: volumetricDivisor })
    .eq('id', agencyOrgId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ups-rates');
  return { success: true };
}

