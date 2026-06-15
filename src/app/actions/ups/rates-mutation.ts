'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { validateUserAction } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

// ─── Zod Schemas ───────────────────────────────────────────────

const zoneSchema = z.object({
  zone_code: z.string().min(1).max(10),
  zone_name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const zoneCountrySchema = z.object({
  zone_id: z.string().uuid(),
  country_code: z.string().length(3), // ISO 3166-1 alpha-3
});

const productSchema = z.object({
  product_code: z.string().min(1).max(50),
  sub_code: z.string().max(50).nullable().optional(),
  product_name: z.string().min(1).max(200),
  cargo_type: z.enum(['DOC', 'NON_DOC', 'BOTH']),
  ddu_available: z.boolean().default(false),
  ddp_available: z.boolean().default(false),
  sort_order: z.number().int().min(0).optional(),
});

const baseRateSchema = z.object({
  product_id: z.string().uuid(),
  zone_id: z.string().uuid(),
  weight_kg: z.number().positive().max(999.9),
  selling_price: z.number().nonnegative().max(99999999),
  cost_price: z.number().nonnegative().max(99999999),
  currency: z.string().length(3).default('USD'),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const fuelSurchargeSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  effective_week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selling_rate: z.number().nonnegative().max(1),
  cost_rate: z.number().nonnegative().max(1),
});

const otherChargeSchema = z.object({
  charge_code: z.string().min(1).max(50),
  charge_name: z.string().min(1).max(200),
  unit: z.string().min(1).max(20),
  fuel_surcharge_applicable: z.boolean().default(false),
  selling_price: z.number().nonnegative().nullable().optional(),
  cost_price: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).default('USD'),
});

// ─── Helpers ───────────────────────────────────────────────────

async function checkAdminOrManager() {
  const { profile } = await validateUserAction();
  if (!profile) throw new Error('User profile not found');
  const allowed = ['ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'];
  if (!allowed.includes(profile.role)) {
    throw new Error('Permission denied: ADMIN or MANAGER required');
  }
  return profile;
}

// ─── Zone CRUD ─────────────────────────────────────────────────

export async function createUpsZone(data: unknown) {
  const profile = await checkAdminOrManager();
  const parsed = zoneSchema.parse(data);
  const supabase = await createClient();
  const { data: zone, error } = await supabase
    .from('zen_ups_zones')
    .insert({ ...parsed, is_active: true, created_by: profile.id })
    .select()
    .single();
  if (error) { logger.error('createUpsZone:', error); throw new Error(`Zone creation failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return zone;
}

export async function updateUpsZone(id: string, data: unknown) {
  await checkAdminOrManager();
  const parsed = zoneSchema.partial().parse(data);
  const supabase = await createClient();
  const { data: zone, error } = await supabase
    .from('zen_ups_zones')
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) { logger.error('updateUpsZone:', error); throw new Error(`Zone update failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return zone;
}

export async function addZoneCountry(zoneId: string, countryCode: string) {
  const profile = await checkAdminOrManager();
  const parsed = zoneCountrySchema.parse({ zone_id: zoneId, country_code: countryCode });
  const supabase = await createClient();
  const { error } = await supabase
    .from('zen_ups_zone_countries')
    .insert({ ...parsed, created_by: profile.id })
    .select()
    .single();
  if (error) { logger.error('addZoneCountry:', error); throw new Error(`Country mapping failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return { success: true };
}

export async function removeZoneCountry(zoneId: string, countryCode: string) {
  await checkAdminOrManager();
  const supabase = await createClient();
  const { error } = await supabase
    .from('zen_ups_zone_countries')
    .delete()
    .eq('zone_id', zoneId)
    .eq('country_code', countryCode);
  if (error) { logger.error('removeZoneCountry:', error); throw new Error(`Country removal failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return { success: true };
}

// ─── Product CRUD ──────────────────────────────────────────────

export async function createUpsProduct(data: unknown) {
  const profile = await checkAdminOrManager();
  const parsed = productSchema.parse(data);
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('zen_ups_products')
    .insert({ ...parsed, is_active: true, created_by: profile.id })
    .select()
    .single();
  if (error) { logger.error('createUpsProduct:', error); throw new Error(`Product creation failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return product;
}

export async function updateUpsProduct(id: string, data: unknown) {
  await checkAdminOrManager();
  const parsed = productSchema.partial().parse(data);
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('zen_ups_products')
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) { logger.error('updateUpsProduct:', error); throw new Error(`Product update failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return product;
}

// ─── Base Rate CRUD ────────────────────────────────────────────

export async function upsertUpsBaseRate(data: unknown) {
  const profile = await checkAdminOrManager();
  const parsed = baseRateSchema.parse(data);
  const supabase = await createClient();
  const { data: rate, error } = await supabase
    .from('zen_ups_base_rates')
    .upsert({ ...parsed, is_active: true, created_by: profile.id },
      { onConflict: 'product_id,zone_id,weight_kg', ignoreDuplicates: false })
    .select()
    .single();
  if (error) { logger.error('upsertUpsBaseRate:', error); throw new Error(`Base rate upsert failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return rate;
}

export async function deactivateUpsBaseRate(id: string) {
  await checkAdminOrManager();
  const supabase = await createClient();
  const { error } = await supabase
    .from('zen_ups_base_rates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { logger.error('deactivateUpsBaseRate:', error); throw new Error(`Deactivation failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return { success: true };
}

// ─── Fuel Surcharge CRUD ──────────────────────────────────────

export async function upsertUpsFuelSurcharge(data: unknown) {
  const profile = await checkAdminOrManager();
  const parsed = fuelSurchargeSchema.parse(data);
  const supabase = await createClient();
  const { data: fs, error } = await supabase
    .from('zen_ups_fuel_surcharges')
    .upsert({ ...parsed, created_by: profile.id },
      { onConflict: 'product_id,effective_week', ignoreDuplicates: false })
    .select()
    .single();
  if (error) { logger.error('upsertUpsFuelSurcharge:', error); throw new Error(`Fuel surcharge upsert failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return fs;
}

// ─── Other Charge CRUD ─────────────────────────────────────────

export async function createUpsOtherCharge(data: unknown) {
  const profile = await checkAdminOrManager();
  const parsed = otherChargeSchema.parse(data);
  const supabase = await createClient();
  const { data: oc, error } = await supabase
    .from('zen_ups_other_charges')
    .insert({ ...parsed, is_active: true, created_by: profile.id })
    .select()
    .single();
  if (error) { logger.error('createUpsOtherCharge:', error); throw new Error(`Other charge creation failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return oc;
}

export async function updateUpsOtherCharge(id: string, data: unknown) {
  await checkAdminOrManager();
  const parsed = otherChargeSchema.partial().parse(data);
  const supabase = await createClient();
  const { data: oc, error } = await supabase
    .from('zen_ups_other_charges')
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) { logger.error('updateUpsOtherCharge:', error); throw new Error(`Other charge update failed: ${error.message}`); }
  revalidatePath('/(dashboard)/admin/ups-rates', 'page');
  return oc;
}
