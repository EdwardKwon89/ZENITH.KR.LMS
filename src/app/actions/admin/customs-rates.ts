"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

export interface CreateCustomsRateData {
  org_id: string;
  country_code: string;
  currency?: string;
  cost_per_kg?: number | null;
  cost_per_cbm?: number | null;
  fixed_fee?: number | null;
  transit_days?: number | null;
  valid_from: string;
  valid_until?: string | null;
}

export interface CustomsRate extends CreateCustomsRateData {
  id: string;
  is_active: boolean;
  version_no: number;
  created_at: string;
  created_by: string | null;
}

function canWriteCustomsRates(role: string | undefined): boolean {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER || role === USER_ROLES.CUSTOMS_BROKER;
}

export const createCustomsRate = withAction(async function (data: CreateCustomsRateData) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || !canWriteCustomsRates(profile.role)) {
    throw new Error("통관 서비스 요율 등록 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.CUSTOMS_BROKER) {
    const brokerOrgId = profile.org_id;
    if (data.org_id !== brokerOrgId) {
      throw new Error("본인 조직의 요율만 등록할 수 있습니다.");
    }
  }

  const { data: rate, error } = await supabase
    .from('zen_customs_rates')
    .insert({
      org_id: data.org_id,
      country_code: data.country_code.toUpperCase(),
      currency: data.currency ?? 'USD',
      cost_per_kg: data.cost_per_kg ?? null,
      cost_per_cbm: data.cost_per_cbm ?? null,
      fixed_fee: data.fixed_fee ?? 0,
      transit_days: data.transit_days ?? null,
      valid_from: data.valid_from,
      valid_until: data.valid_until ?? null,
      is_active: true,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) throw new Error(`통관 요율 등록 실패: ${error.message}`);

  revalidatePath('/admin/customs-rates');
  return rate;
});

export const updateCustomsRate = withAction(async function (id: string, data: Partial<CreateCustomsRateData>) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || !canWriteCustomsRates(profile.role)) {
    throw new Error("통관 서비스 요율 수정 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.CUSTOMS_BROKER) {
    const { data: existing } = await supabase
      .from('zen_customs_rates')
      .select('org_id')
      .eq('id', id)
      .single();

    if (existing && existing.org_id !== profile.org_id) {
      throw new Error("본인 조직의 요율만 수정할 수 있습니다.");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.org_id !== undefined) updateData.org_id = data.org_id;
  if (data.country_code !== undefined) updateData.country_code = data.country_code.toUpperCase();
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.cost_per_kg !== undefined) updateData.cost_per_kg = data.cost_per_kg;
  if (data.cost_per_cbm !== undefined) updateData.cost_per_cbm = data.cost_per_cbm;
  if (data.fixed_fee !== undefined) updateData.fixed_fee = data.fixed_fee;
  if (data.transit_days !== undefined) updateData.transit_days = data.transit_days;
  if (data.valid_from !== undefined) updateData.valid_from = data.valid_from;
  if (data.valid_until !== undefined) updateData.valid_until = data.valid_until;

  const { error } = await supabase
    .from('zen_customs_rates')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`통관 요율 수정 실패: ${error.message}`);

  revalidatePath('/admin/customs-rates');
  return true;
});

export async function getCustomsRates(orgId?: string) {
  const { supabase, profile } = await validateUserAction();

  let query = supabase
    .from('zen_customs_rates')
    .select('*, zen_organizations!inner(name)')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  if (profile?.role === USER_ROLES.CUSTOMS_BROKER) {
    query = query.eq('org_id', profile.org_id);
  }

  if (profile?.role === USER_ROLES.CORPORATE || profile?.role === USER_ROLES.INDIVIDUAL || profile?.role === USER_ROLES.CARRIER) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("[ERROR] getCustomsRates failed:", error);
    throw new Error(`통관 요율 조회 실패: ${error.message}`);
  }

  return data || [];
}

export const deleteCustomsRate = withAction(async function (id: string) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER && profile.role !== USER_ROLES.CUSTOMS_BROKER)) {
    throw new Error("통관 서비스 요율 삭제 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.CUSTOMS_BROKER) {
    const { data: existing } = await supabase
      .from('zen_customs_rates')
      .select('org_id')
      .eq('id', id)
      .single();

    if (existing && existing.org_id !== profile.org_id) {
      throw new Error("본인 조직의 요율만 삭제할 수 있습니다.");
    }
  }

  const { error } = await supabase
    .from('zen_customs_rates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new Error(`통관 요율 삭제 실패: ${error.message}`);

  revalidatePath('/admin/customs-rates');
  return true;
});
