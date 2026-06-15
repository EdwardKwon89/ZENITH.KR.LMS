"use server";

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { createAdminClient } from '@/utils/supabase/server';
import { CreateAgencyShipperSchema, UpdateAgencyShipperGradeSchema } from '@/lib/validations/agency';
import type { CreateAgencyShipperInput } from '@/types/agency';
import { revalidatePath } from 'next/cache';

export async function getAgencyShippers(agencyOrgId: string) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('zen_agency_shippers')
    .select(`
      id,
      agency_org_id,
      shipper_org_id,
      shipper_type,
      discount_rate,
      grade,
      is_active,
      created_at,
      shipper:shipper_org_id (
        id,
        name,
        biz_no,
        status
      )
    `)
    .eq('agency_org_id', agencyOrgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[getAgencyShippers] Failed:', error.message);
    throw new Error(`Failed to fetch agency shippers: ${error.message}`);
  }

  return { shippers: data || [] };
}

export async function createAgencyShipper(
  agencyOrgId: string,
  shipperData: CreateAgencyShipperInput
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const parsed = CreateAgencyShipperSchema.safeParse(shipperData);
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }

  const supabase = await createAdminClient();

  const { data: org, error: orgError } = await supabase
    .from('zen_organizations')
    .insert({
      name: parsed.data.name,
      type: 'SHIPPER',
      status: 'ACTIVE',
    })
    .select('id')
    .single();

  if (orgError) {
    logger.error('[createAgencyShipper] Organization creation failed:', orgError.message);
    throw new Error(`Failed to create shipper organization: ${orgError.message}`);
  }

  const { data: link, error: linkError } = await supabase
    .from('zen_agency_shippers')
    .insert({
      agency_org_id: agencyOrgId,
      shipper_org_id: org.id,
      shipper_type: parsed.data.shipper_type,
      discount_rate: parsed.data.discount_rate,
      grade: parsed.data.grade || null,
    })
    .select('id')
    .single();

  if (linkError) {
    logger.error('[createAgencyShipper] Link creation failed:', linkError.message);
    throw new Error(`Failed to create agency shipper link: ${linkError.message}`);
  }

  logger.info(`[createAgencyShipper] Shipper created: org=${org.id}, link=${link.id}`);
  revalidatePath('/agency/shippers');
  return { success: true, shipperId: link.id };
}

export async function updateAgencyShipperGrade(
  id: string,
  grade: string,
  discountRate: number
) {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    throw new Error('Unauthorized access');
  }

  const parsed = UpdateAgencyShipperGradeSchema.safeParse({ grade, discount_rate: discountRate });
  if (!parsed.success) {
    throw new Error(`Validation failed: ${parsed.error.message}`);
  }

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('zen_agency_shippers')
    .update({
      grade: parsed.data.grade,
      discount_rate: parsed.data.discount_rate,
    })
    .eq('id', id);

  if (error) {
    logger.error('[updateAgencyShipperGrade] Failed:', error.message);
    throw new Error(`Failed to update shipper grade: ${error.message}`);
  }

  logger.info(`[updateAgencyShipperGrade] Shipper ${id} grade updated`);
  revalidatePath('/agency/shippers');
  return { success: true };
}
