"use server";

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/server';
import { CreateAgencyShipperSchema, UpdateAgencyShipperGradeSchema } from '@/lib/validations/agency';
import type { CreateAgencyShipperInput } from '@/types/agency';
import { revalidatePath } from 'next/cache';

async function _createShipperOrg(
  supabase: SupabaseClient,
  name: string,
  bizNo?: string | null,
  repName?: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from('zen_organizations')
    .insert({ name, type: 'SHIPPER', status: 'ACTIVE', biz_no: bizNo ?? null, rep_name: repName ?? null })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create shipper org: ${error.message}`);
  return data.id;
}

async function _linkShipperToAgency(
  supabase: SupabaseClient,
  agencyOrgId: string,
  shipperOrgId: string,
  data: Pick<CreateAgencyShipperInput, 'shipper_type' | 'discount_rate' | 'grade'>
): Promise<string> {
  const { data: link, error } = await supabase
    .from('zen_agency_shippers')
    .insert({
      agency_org_id: agencyOrgId,
      shipper_org_id: shipperOrgId,
      shipper_type: data.shipper_type,
      discount_rate: data.discount_rate,
      grade: data.grade ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to link shipper: ${error.message}`);
  return link.id;
}

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

export type CreateAgencyShipperResult =
  | { success: true; shipperId: string }
  | { success: false; fieldErrors: Record<string, string> }

export async function createAgencyShipper(
  agencyOrgId: string,
  shipperData: CreateAgencyShipperInput
): Promise<CreateAgencyShipperResult> {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    return { success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } };
  }

  const parsed = CreateAgencyShipperSchema.safeParse(shipperData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach((e) => {
      const field = String(e.path[0] ?? '_form');
      if (!fieldErrors[field]) fieldErrors[field] = e.message;
    });
    return { success: false, fieldErrors };
  }

  const supabase = await createAdminClient();
  const orgId = await _createShipperOrg(supabase, parsed.data.name, parsed.data.biz_no, parsed.data.rep_name);
  const linkId = await _linkShipperToAgency(
    supabase, agencyOrgId, orgId, parsed.data
  );

  logger.info(`[createAgencyShipper] Shipper created: org=${orgId}, link=${linkId}`);
  revalidatePath('/agency/shippers');
  return { success: true, shipperId: linkId };
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
