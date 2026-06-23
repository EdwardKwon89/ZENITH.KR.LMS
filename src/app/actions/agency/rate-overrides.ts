"use server";

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { createAdminClient } from '@/utils/supabase/server';
import { CreateAgencyRateOverrideSchema } from '@/lib/validations/agency';
import type { CreateAgencyRateOverrideInput, AgencyRateOverrideWithRefs } from '@/types/agency';
import { revalidatePath } from 'next/cache';

export async function getAgencyRateOverrides(agencyOrgId: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('zen_agency_rate_overrides')
    .select(`
      *,
      base_rate:base_rate_id (
        product_id,
        zone_id,
        weight_kg,
        currency,
        product:product_id (product_code, product_name),
        zone:zone_id (zone_code, zone_name)
      )
    `)
    .eq('agency_org_id', agencyOrgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[getAgencyRateOverrides] Failed:', error.message);
    throw new Error(`Failed to fetch rate overrides: ${error.message}`);
  }

  return { overrides: (data ?? []) as unknown as AgencyRateOverrideWithRefs[] };
}

export async function upsertAgencyRateOverride(
  agencyOrgId: string,
  data: CreateAgencyRateOverrideInput
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const parsed = CreateAgencyRateOverrideSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('zen_agency_rate_overrides')
    .upsert({
      agency_org_id: agencyOrgId,
      base_rate_id: parsed.data.base_rate_id,
      selling_price: parsed.data.selling_price,
      cost_price: parsed.data.cost_price,
      valid_from: parsed.data.valid_from,
      valid_until: parsed.data.valid_until ?? null,
      is_active: true,
      created_by: profile.id,
    }, { onConflict: 'agency_org_id,base_rate_id,valid_from' });

  if (error) {
    logger.error('[upsertAgencyRateOverride] Failed:', error.message);
    throw new Error(`Failed to upsert rate override: ${error.message}`);
  }

  logger.info(`[upsertAgencyRateOverride] Override upserted by ${profile.id}`);
  revalidatePath('/agency/rate-overrides');
  return { success: true };
}

export async function deactivateAgencyRateOverride(id: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('zen_agency_rate_overrides')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    logger.error('[deactivateAgencyRateOverride] Failed:', error.message);
    throw new Error(`Failed to deactivate rate override: ${error.message}`);
  }

  logger.info(`[deactivateAgencyRateOverride] Override ${id} deactivated by ${profile.id}`);
  revalidatePath('/agency/rate-overrides');
  return { success: true };
}
