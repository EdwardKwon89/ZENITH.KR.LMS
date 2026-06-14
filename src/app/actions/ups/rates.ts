'use server';

import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';
import type {
  UpsZoneWithCountries,
  UpsProduct,
  UpsBaseRate,
  UpsFuelSurcharge,
  UpsOtherCharge,
  UpsCargoType,
} from '@/types/ups';

export async function getUpsZones(): Promise<UpsZoneWithCountries[]> {
  const { supabase } = await validateUserAction();
  const { data: zones, error } = await supabase
    .from('zen_ups_zones')
    .select('*, countries:zen_ups_zone_countries(*)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return zones ?? [];
}

export async function getUpsProducts(cargoType?: UpsCargoType): Promise<UpsProduct[]> {
  const { supabase } = await validateUserAction();
  const base = supabase
    .from('zen_ups_products')
    .select('*')
    .eq('is_active', true);
  const chained = cargoType ? base.eq('cargo_type', cargoType) : base;
  const { data, error } = await chained.order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUpsBaseRates(filters?: {
  productId?: string;
  zoneId?: string;
  referenceDate?: string;
}): Promise<UpsBaseRate[]> {
  const { supabase } = await validateUserAction();
  const refDate = filters?.referenceDate ?? new Date().toISOString().split('T')[0];
  let base = supabase
    .from('zen_ups_base_rates')
    .select('*')
    .eq('is_active', true)
    .lte('valid_from', refDate)
    .or(`valid_until.is.null,valid_until.gte.${refDate}`);
  if (filters?.productId) base = base.eq('product_id', filters.productId);
  if (filters?.zoneId) base = base.eq('zone_id', filters.zoneId);
  const { data, error } = await base.order('weight_kg');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUpsFuelSurcharge(
  productId?: string | null,
  referenceDate?: string
): Promise<UpsFuelSurcharge | null> {
  const { supabase } = await validateUserAction();
  const refDate = referenceDate ?? new Date().toISOString().split('T')[0];
  const base = supabase
    .from('zen_ups_fuel_surcharges')
    .select('*')
    .lte('effective_week', refDate);
  const chained = productId
    ? base.or(`product_id.eq.${productId},product_id.is.null`)
    : base;
  const { data, error } = await chained.order('effective_week', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function getUpsOtherCharges(): Promise<UpsOtherCharge[]> {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_ups_other_charges')
    .select('*')
    .eq('is_active', true)
    .order('charge_code');
  if (error) throw new Error(error.message);
  return data ?? [];
}
