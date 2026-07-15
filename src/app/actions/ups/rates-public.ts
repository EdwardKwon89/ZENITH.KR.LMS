'use server';

import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';

export interface PublicBaseRate {
  id: string;
  product_id: string;
  zone_id: string;
  weight_kg: number;
  selling_price: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  product: { product_code: string; product_name: string; cargo_type: string } | null;
  zone: { zone_code: string; zone_name: string } | null;
}

export async function getPublicBaseRates(): Promise<PublicBaseRate[]> {
  const { supabase } = await validateUserAction();
  const refDate = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('zen_ups_base_rates')
    .select('id, product_id, zone_id, weight_kg, selling_price, currency, valid_from, valid_until, product:product_id(product_code, product_name, cargo_type), zone:zone_id(zone_code, zone_name)')
    .eq('is_active', true)
    .lte('valid_from', refDate)
    .or(`valid_until.is.null,valid_until.gte.${refDate}`)
    .order('weight_kg');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicBaseRate[];
}

export interface PublicFuelSurcharge {
  id: string;
  product_id: string | null;
  effective_week: string;
  selling_rate: number;
  product: { product_code: string; product_name: string } | null;
}

export async function getPublicFuelSurcharges(): Promise<PublicFuelSurcharge[]> {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_ups_fuel_surcharges')
    .select('id, product_id, effective_week, selling_rate, product:product_id(product_code, product_name)')
    .order('effective_week', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicFuelSurcharge[];
}

export interface PublicOtherCharge {
  id: string;
  charge_code: string;
  charge_name: string;
  unit: string;
  fuel_surcharge_applicable: boolean;
  selling_price: number | null;
  currency: string;
}

export async function getPublicOtherCharges(): Promise<PublicOtherCharge[]> {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_ups_other_charges')
    .select('id, charge_code, charge_name, unit, fuel_surcharge_applicable, selling_price, currency')
    .eq('is_active', true)
    .order('charge_code');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicOtherCharge[];
}

export interface PublicWeightTierRate {
  id: string;
  product_id: string;
  zone_id: string;
  tier_min_kg: number;
  tier_max_kg: number | null;
  price_per_kg_selling: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  product: { product_code: string; product_name: string } | null;
  zone: { zone_code: string; zone_name: string } | null;
}

export async function getPublicWeightTierRates(): Promise<PublicWeightTierRate[]> {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_ups_weight_tier_rates')
    .select('id, product_id, zone_id, tier_min_kg, tier_max_kg, price_per_kg_selling, currency, valid_from, valid_until, product:product_id(product_code, product_name), zone:zone_id(zone_code, zone_name)')
    .eq('is_active', true)
    .order('tier_min_kg');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicWeightTierRate[];
}

export interface PublicFreightMinimum {
  id: string;
  zone_id: string;
  product_id: string;
  min_charge_selling: number;
  currency: string;
  product: { product_code: string; product_name: string } | null;
  zone: { zone_code: string; zone_name: string } | null;
}

export async function getPublicFreightMinimums(): Promise<PublicFreightMinimum[]> {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from('zen_ups_freight_minimums')
    .select('id, zone_id, product_id, min_charge_selling, currency, product:product_id(product_code, product_name), zone:zone_id(zone_code, zone_name)')
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicFreightMinimum[];
}

// Issue #491: 급증 긴급 수수료 — Agency 조회 전용(원가 필드 제외), 현재 유효 구간만 노출
export interface PublicSurgeFee {
  id: string;
  destination_country_code: string;
  selling_rate_per_kg: number;
  currency: string;
  effective_from: string;
  effective_until: string | null;
}

export async function getPublicSurgeFees(): Promise<PublicSurgeFee[]> {
  const { supabase } = await validateUserAction();
  const refDate = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('zen_ups_surge_fees')
    .select('id, destination_country_code, selling_rate_per_kg, currency, effective_from, effective_until')
    .eq('is_active', true)
    .lte('effective_from', refDate)
    .or(`effective_until.is.null,effective_until.gte.${refDate}`)
    .order('destination_country_code');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PublicSurgeFee[];
}
