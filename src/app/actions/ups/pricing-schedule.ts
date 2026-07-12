'use server';

import { revalidatePath } from 'next/cache';
import { validateUserAction } from '@/lib/auth/guards';
import { USER_ROLES } from '@/lib/auth/rbac';
import { createAdminClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

type SettingType = 'AGENCY_DISCOUNT' | 'SHIPPER_DISCOUNT' | 'VOLUMETRIC_DIVISOR';

interface CreatePricingScheduleInput {
  setting_type: SettingType;
  target_ref: Record<string, string>;
  new_value: number;
  valid_from: string;
  valid_until?: string | null;
}

interface UpdatePricingScheduleInput {
  new_value?: number;
  valid_from?: string;
  valid_until?: string | null;
}

// ─── 검증 헬퍼 ──────────────────────────────────────

function requireAdminOrManager(role: string | undefined) {
  if (!role || (role !== USER_ROLES.ADMIN && role !== USER_ROLES.MANAGER && role !== USER_ROLES.ZENITH_SUPER_ADMIN)) {
    throw new Error('UPS 요율 관리 권한이 없습니다.');
  }
}

function requireSchedulePermission(role: string | undefined, settingType: SettingType, targetRef: Record<string, string>, profileOrgId?: string) {
  const isAdmin = role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER || role === USER_ROLES.ZENITH_SUPER_ADMIN;
  const isAgency = role === USER_ROLES.AGENCY;

  if (isAdmin) return;

  if (isAgency && settingType === 'SHIPPER_DISCOUNT') {
    if (!profileOrgId) throw new Error('조직 정보를 찾을 수 없습니다.');
    if (targetRef.agency_org_id !== profileOrgId) throw new Error('본인 소속 대리점의 할인율만 관리할 수 있습니다.');
    return;
  }

  throw new Error('UPS 요율 관리 권한이 없습니다.');
}

function validateScheduleDates(validFrom: string, validUntil?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fromDate = new Date(validFrom);

  if (fromDate <= today) {
    throw new Error('적용일자는 내일 이후만 가능합니다.');
  }

  if (validUntil) {
    const untilDate = new Date(validUntil);
    if (untilDate <= fromDate) {
      throw new Error('종료일자는 적용일자 이후여야 합니다.');
    }
  }
}

async function checkOverlap(
  admin: any,
  settingType: SettingType,
  targetRef: Record<string, string>,
  validFrom: string,
  validUntil: string | null,
  excludeId?: string
) {
  let query = admin
    .from('zen_ups_pricing_schedule')
    .select('id, valid_from, valid_until, new_value')
    .eq('setting_type', settingType)
    .eq('status', 'SCHEDULED')
    .eq('target_ref', targetRef);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: existing, error } = await query;

  if (error) throw new Error(error.message);

  if (existing && existing.length > 0) {
    for (const row of existing) {
      const rowFrom = new Date(row.valid_from);
      const rowUntil = row.valid_until ? new Date(row.valid_until) : new Date('9999-12-31');
      const newFrom = new Date(validFrom);
      const newUntil = validUntil ? new Date(validUntil) : new Date('9999-12-31');

      if (newFrom < rowUntil && newUntil > rowFrom) {
        throw new Error(`기간이 겹치는 예약이 이미 존재합니다 (${row.valid_from} ~ ${row.valid_until || '무기한'}).`);
      }
    }
  }
}

async function insertAuditLog(
  admin: any,
  params: {
    setting_type: SettingType;
    target_ref: Record<string, string>;
    action: string;
    old_data?: any;
    new_data?: any;
    changed_by: string;
  }
) {
  const { error } = await admin.from('zen_ups_pricing_setting_audit_log').insert({
    setting_type: params.setting_type,
    target_ref: params.target_ref,
    action: params.action,
    old_data: params.old_data ?? null,
    new_data: params.new_data ?? null,
    changed_by: params.changed_by,
  });

  if (error) {
    logger.error('[pricing-schedule] audit_log insert error:', error.message);
  }
}

// ─── 등록 ──────────────────────────────────────────

export async function createPricingSchedule(input: CreatePricingScheduleInput) {
  const { supabase, profile } = await validateUserAction();
  requireSchedulePermission(profile?.role, input.setting_type, input.target_ref, profile?.org_id);

  validateScheduleDates(input.valid_from, input.valid_until);

  const admin = await createAdminClient();

  await checkOverlap(
    admin,
    input.setting_type,
    input.target_ref,
    input.valid_from,
    input.valid_until ?? null
  );

  const insertData = {
    setting_type: input.setting_type,
    target_ref: input.target_ref,
    new_value: input.new_value,
    valid_from: input.valid_from,
    valid_until: input.valid_until ?? null,
    status: 'SCHEDULED' as const,
    created_by: profile.id,
  };

  const { data, error } = await admin
    .from('zen_ups_pricing_schedule')
    .insert(insertData)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await insertAuditLog(admin, {
    setting_type: input.setting_type,
    target_ref: input.target_ref,
    action: 'CREATE',
    new_data: { ...insertData, id: data.id },
    changed_by: profile.id,
  });

  revalidatePath('/admin/ups-rates');
  return data;
}

// ─── 수정 ──────────────────────────────────────────

export async function updatePricingSchedule(id: string, input: UpdatePricingScheduleInput) {
  const { supabase, profile } = await validateUserAction();

  const admin = await createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('zen_ups_pricing_schedule')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) throw new Error('해당 예약을 찾을 수 없습니다.');
  if (existing.status !== 'SCHEDULED') throw new Error('SCHEDULED 상태인 예약만 수정 가능합니다.');

  requireSchedulePermission(profile?.role, existing.setting_type, existing.target_ref, profile?.org_id);

  const newValidFrom = input.valid_from ?? existing.valid_from;
  const newValidUntil = input.valid_until !== undefined ? input.valid_until : existing.valid_until;
  const newValue = input.new_value ?? existing.new_value;

  if (input.valid_from || input.valid_until !== undefined) {
    validateScheduleDates(newValidFrom, newValidUntil);
  }

  if (input.valid_from || input.valid_until !== undefined || input.new_value !== undefined) {
    await checkOverlap(
      admin,
      existing.setting_type,
      existing.target_ref,
      newValidFrom,
      newValidUntil,
      id
    );
  }

  const updateData: Record<string, any> = {};
  if (input.new_value !== undefined) updateData.new_value = input.new_value;
  if (input.valid_from) updateData.valid_from = input.valid_from;
  if (input.valid_until !== undefined) updateData.valid_until = input.valid_until;

  const { error } = await admin
    .from('zen_ups_pricing_schedule')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(error.message);

  await insertAuditLog(admin, {
    setting_type: existing.setting_type,
    target_ref: existing.target_ref,
    action: 'UPDATE',
    old_data: { new_value: existing.new_value, valid_from: existing.valid_from, valid_until: existing.valid_until },
    new_data: { new_value: newValue, valid_from: newValidFrom, valid_until: newValidUntil },
    changed_by: profile.id,
  });

  revalidatePath('/admin/ups-rates');
}

// ─── 취소 ──────────────────────────────────────────

export async function cancelPricingSchedule(id: string) {
  const { supabase, profile } = await validateUserAction();

  const admin = await createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('zen_ups_pricing_schedule')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) throw new Error('해당 예약을 찾을 수 없습니다.');
  if (existing.status !== 'SCHEDULED') throw new Error('SCHEDULED 상태인 예약만 취소 가능합니다.');

  requireSchedulePermission(profile?.role, existing.setting_type, existing.target_ref, profile?.org_id);

  const { error } = await admin
    .from('zen_ups_pricing_schedule')
    .update({ status: 'CANCELLED' })
    .eq('id', id);

  if (error) throw new Error(error.message);

  await insertAuditLog(admin, {
    setting_type: existing.setting_type,
    target_ref: existing.target_ref,
    action: 'CANCEL',
    old_data: { new_value: existing.new_value, valid_from: existing.valid_from, valid_until: existing.valid_until },
    changed_by: profile.id,
  });

  revalidatePath('/admin/ups-rates');
}

// ─── 조회 ──────────────────────────────────────────

export async function getScheduledPricingChanges(settingType?: SettingType) {
  const { supabase, profile } = await validateUserAction();
  const isAdmin = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.MANAGER || profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN;
  const isAgency = profile?.role === USER_ROLES.AGENCY;

  if (!isAdmin && !(isAgency && settingType === 'SHIPPER_DISCOUNT')) {
    throw new Error('UPS 요율 관리 권한이 없습니다.');
  }

  let query = supabase
    .from('zen_ups_pricing_schedule')
    .select('*')
    .order('valid_from', { ascending: true });

  if (settingType) {
    query = query.eq('setting_type', settingType);
  }

  if (isAgency && profile?.org_id) {
    query = query.eq('target_ref->>agency_org_id', profile.org_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPricingAuditLog(settingType?: SettingType, targetRef?: Record<string, string>) {
  const { supabase, profile } = await validateUserAction();
  const isAdmin = profile?.role === USER_ROLES.ADMIN || profile?.role === USER_ROLES.MANAGER || profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN;
  const isAgency = profile?.role === USER_ROLES.AGENCY;

  if (!isAdmin && !(isAgency && settingType === 'SHIPPER_DISCOUNT')) {
    throw new Error('UPS 요율 관리 권한이 없습니다.');
  }

  let query = supabase
    .from('zen_ups_pricing_setting_audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(100);

  if (settingType) {
    query = query.eq('setting_type', settingType);
  }

  if (targetRef) {
    query = query.eq('target_ref', targetRef);
  }

  if (isAgency && profile?.org_id) {
    query = query.eq('target_ref->>agency_org_id', profile.org_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}
