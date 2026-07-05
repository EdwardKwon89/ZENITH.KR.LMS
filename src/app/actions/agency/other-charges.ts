'use server';

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface AgencyOtherChargeRow {
  id: string;
  agency_org_id: string;
  other_charge_id: string;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
  created_at: string;
  other_charge: { charge_code: string; charge_name: string; unit: string } | null;
}

export async function getAgencyOtherCharges(agencyOrgId: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('zen_agency_other_charges')
    .select('*, other_charge:other_charge_id(charge_code, charge_name, unit)')
    .eq('agency_org_id', agencyOrgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[getAgencyOtherCharges] Failed:', error.message);
    throw new Error(`Failed to fetch agency other charges: ${error.message}`);
  }

  return (data ?? []) as AgencyOtherChargeRow[];
}

export async function upsertAgencyOtherCharge(
  agencyOrgId: string,
  data: {
    other_charge_id: string;
    selling_price: number;
    cost_price: number;
  }
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('zen_agency_other_charges')
    .upsert({
      agency_org_id: agencyOrgId,
      other_charge_id: data.other_charge_id,
      selling_price: data.selling_price,
      cost_price: data.cost_price,
      is_active: true,
      created_by: profile.id,
    }, { onConflict: 'agency_org_id,other_charge_id' });

  if (error) {
    logger.error('[upsertAgencyOtherCharge] Failed:', error.message);
    throw new Error(`Failed to upsert agency other charge: ${error.message}`);
  }

  logger.info(`[upsertAgencyOtherCharge] ${data.other_charge_id} upserted by ${profile.id}`);
  revalidatePath('/agency/other-charges');
  return { success: true };
}

export async function deactivateAgencyOtherCharge(id: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('zen_agency_other_charges')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    logger.error('[deactivateAgencyOtherCharge] Failed:', error.message);
    throw new Error(`Failed to deactivate agency other charge: ${error.message}`);
  }

  revalidatePath('/agency/other-charges');
  return { success: true };
}
