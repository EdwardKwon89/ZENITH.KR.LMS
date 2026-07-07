"use server";

import { logger } from '@/lib/logger';
import { validateUserAction, checkPermission } from '@/lib/auth/guards';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/server';
import { CreateAgencyShipperSchema, UpdateAgencyShipperGradeSchema, UpdateAgencyShipperSchema } from '@/lib/validations/agency';
import type { CreateAgencyShipperInput, UpdateAgencyShipperInput, AgencyShipperRow } from '@/types/agency';
import { generateTempPassword, sendShipperWelcomeEmail } from '@/lib/notifications/email';
import { revalidatePath } from 'next/cache';

async function _createShipperOrg(
  supabase: SupabaseClient,
  name: string,
  bizNo?: string | null,
  repName?: string | null,
  contactName?: string | null,
  contactEmail?: string | null,
  contactPhone?: string | null,
  addressFields?: {
    country_code?: string;
    state_province?: string;
    city?: string;
    address?: string;
    address_detail?: string;
    zipcode?: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('zen_organizations')
    .insert({
      name,
      type: 'SHIPPER',
      status: 'ACTIVE',
      biz_no: bizNo ?? null,
      rep_name: repName ?? null,
      contact_name: contactName ?? null,
      contact_email: contactEmail ?? null,
      contact_phone: contactPhone ?? null,
      country_code: addressFields?.country_code ?? null,
      state_province: addressFields?.state_province ?? null,
      city: addressFields?.city ?? null,
      address: addressFields?.address ?? null,
      address_detail: addressFields?.address_detail ?? null,
      zipcode: addressFields?.zipcode ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create shipper org: ${error.message}`);
  return data.id;
}

async function _createShipperProfile(
  supabase: SupabaseClient,
  authUid: string,
  email: string,
  fullName: string,
  orgId: string,
  phone?: string | null,
): Promise<void> {
  const { error } = await supabase.from('zen_profiles').insert({
    id: authUid,
    email,
    full_name: fullName,
    org_id: orgId,
    role: 'AGENCY_SHIPPER',
    status: 'ACTIVE',
    is_active: true,
    grade_code: 'BRONZE',
    phone_number: phone ?? null,
  });
  if (error) throw new Error(`Failed to create shipper profile: ${error.message}`);
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
        status,
        contact_name,
        contact_email,
        contact_phone
      )
    `)
    .eq('agency_org_id', agencyOrgId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[getAgencyShippers] Failed:', error.message);
    throw new Error(`Failed to fetch agency shippers: ${error.message}`);
  }

  return { shippers: (data || []) as unknown as AgencyShipperRow[] };
}

export type CreateAgencyShipperResult =
  | { success: true; shipperId: string; inviteEmailSent: boolean }
  | { success: false; fieldErrors: Record<string, string> };

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
    parsed.error.issues.forEach((e) => {
      const field = String(e.path[0] ?? '_form');
      if (!fieldErrors[field]) fieldErrors[field] = e.message;
    });
    return { success: false, fieldErrors };
  }

  const supabase = await createAdminClient();
  const { login_email, name, contact_phone, contact_email, ...rest } = parsed.data;

  // ① Generate temp password
  const tempPassword = generateTempPassword();

  // ② Create Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: login_email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authError) {
    return { success: false, fieldErrors: { login_email: authError.message } };
  }
  const authUid = authData.user.id;

  try {
    // ③ Send welcome email
    await sendShipperWelcomeEmail({
      email: login_email,
      shipperName: name,
      tempPassword,
      agencyContactEmail: contact_email ?? undefined,
    });
  } catch {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUid);
    return { success: false, fieldErrors: { _form: '초대 이메일 발송에 실패했습니다. 다시 시도해주세요.' } };
  }

  let orgId: string;
  try {
    // ④ Create shipper org with address
    orgId = await _createShipperOrg(
      supabase,
      name,
      rest.biz_no,
      rest.rep_name,
      rest.contact_name,
      contact_email,
      contact_phone,
      {
        country_code: rest.country_code,
        state_province: rest.state_province,
        city: rest.city,
        address: rest.address,
        address_detail: rest.address_detail,
        zipcode: rest.zipcode,
      },
    );
  } catch {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUid);
    return { success: false, fieldErrors: { _form: '화주 조직 생성에 실패했습니다.' } };
  }

  try {
    // ⑤ Create shipper profile
    await _createShipperProfile(supabase, authUid, login_email, name, orgId, contact_phone);
  } catch {
    // Rollback: delete auth user + org
    await supabase.auth.admin.deleteUser(authUid);
    await supabase.from('zen_organizations').delete().eq('id', orgId);
    return { success: false, fieldErrors: { _form: '화주 프로필 생성에 실패했습니다.' } };
  }

  let linkId: string;
  try {
    // ⑥ Link shipper to agency
    linkId = await _linkShipperToAgency(supabase, agencyOrgId, orgId, {
      shipper_type: rest.shipper_type,
      discount_rate: rest.discount_rate,
      grade: rest.shipper_type === 'INDIVIDUAL' ? (rest.grade ?? 'BRONZE') : null,
    });
  } catch {
    // Rollback: delete auth user + org + profile
    await supabase.auth.admin.deleteUser(authUid);
    await supabase.from('zen_organizations').delete().eq('id', orgId);
    await supabase.from('zen_profiles').delete().eq('id', authUid);
    return { success: false, fieldErrors: { _form: '화주 연결에 실패했습니다.' } };
  }

  logger.info(`[createAgencyShipper] Shipper created: auth=${authUid}, org=${orgId}, link=${linkId}`);
  revalidatePath('/agency/shippers');
  return { success: true, shipperId: linkId, inviteEmailSent: true };
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

export async function getAgencyShipperById(shipperId: string) {
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
      org:shipper_org_id (
        id,
        name,
        biz_no,
        rep_name,
        contact_name,
        contact_email,
        contact_phone,
        country_code, state_province, city,
        address, address_detail, zipcode
      )
    `)
    .eq('id', shipperId)
    .single();

  if (error) {
    logger.error('[getAgencyShipperById] Failed:', error.message);
    throw new Error(`Failed to fetch shipper: ${error.message}`);
  }

  return { shipper: data };
}

export type UpdateAgencyShipperResult =
  | { success: true }
  | { success: false; fieldErrors: Record<string, string> };

export async function updateAgencyShipper(
  shipperId: string,
  data: UpdateAgencyShipperInput
): Promise<UpdateAgencyShipperResult> {
  const { profile } = await validateUserAction();
  if (!checkPermission(profile.role, '/agency')) {
    return { success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } };
  }

  const parsed = UpdateAgencyShipperSchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((e) => {
      const field = String(e.path[0] ?? '_form');
      if (!fieldErrors[field]) fieldErrors[field] = e.message;
    });
    return { success: false, fieldErrors };
  }

  const supabase = await createAdminClient();

  const effectiveDiscountRate = parsed.data.shipper_type === 'INDIVIDUAL'
    ? 0
    : Number(parsed.data.discount_rate);

  const { data: link, error: linkError } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('id', shipperId)
    .single();
  if (linkError || !link) throw new Error('Shipper not found');

  const { error: orgError } = await supabase
    .from('zen_organizations')
    .update({
      name: parsed.data.name,
      biz_no: parsed.data.biz_no ?? null,
      rep_name: parsed.data.rep_name ?? null,
      contact_name: parsed.data.contact_name ?? null,
      contact_email: parsed.data.contact_email ?? null,
      contact_phone: parsed.data.contact_phone ?? null,
    })
    .eq('id', link.shipper_org_id);
  if (orgError) throw new Error(`Failed to update org: ${orgError.message}`);

  const { error: shipperError } = await supabase
    .from('zen_agency_shippers')
    .update({
      shipper_type: parsed.data.shipper_type,
      discount_rate: effectiveDiscountRate,
      grade: parsed.data.shipper_type === 'INDIVIDUAL' ? (parsed.data.grade ?? null) : null,
    })
    .eq('id', shipperId);
  if (shipperError) throw new Error(`Failed to update shipper: ${shipperError.message}`);

  logger.info(`[updateAgencyShipper] Shipper ${shipperId} updated`);
  revalidatePath('/agency/shippers');
  return { success: true };
}
