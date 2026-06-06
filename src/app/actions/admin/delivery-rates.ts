"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

export interface CreateDeliveryRateData {
  org_id: string;
  service_type: 'LOCAL' | 'TOTAL';
  country_code?: string | null;
  transport_mode?: string | null;
  origin_code?: string | null;
  dest_code?: string | null;
  currency?: string;
  cost_per_kg?: number | null;
  cost_per_cbm?: number | null;
  transit_days?: number | null;
  valid_from: string;
  valid_until?: string | null;
}

export interface DeliveryRate extends CreateDeliveryRateData {
  id: string;
  is_active: boolean;
  version_no: number;
  created_at: string;
  created_by: string | null;
}

function canWriteDeliveryRates(role: string | undefined): boolean {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER || role === USER_ROLES.DELIVERY_AGENT;
}

function validateServiceType(data: CreateDeliveryRateData): string | null {
  if (data.service_type === 'LOCAL' && !data.country_code) {
    return 'LOCAL 배송은 국가 코드(country_code)가 필수입니다.';
  }
  if (data.service_type === 'TOTAL') {
    if (!data.transport_mode) return 'TOTAL 배송은 운송수단(transport_mode)이 필수입니다.';
    if (!data.origin_code) return 'TOTAL 배송은 출발항(origin_code)이 필수입니다.';
    if (!data.dest_code) return 'TOTAL 배송은 도착항(dest_code)이 필수입니다.';
  }
  return null;
}

export const createDeliveryRate = withAction(async function (data: CreateDeliveryRateData) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || !canWriteDeliveryRates(profile.role)) {
    throw new Error("배송 서비스 요율 등록 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.DELIVERY_AGENT) {
    if (data.org_id !== profile.org_id) {
      throw new Error("본인 조직의 요율만 등록할 수 있습니다.");
    }
  }

  const validationError = validateServiceType(data);
  if (validationError) throw new Error(validationError);

  const { data: rate, error } = await supabase
    .from('zen_delivery_rates')
    .insert({
      org_id: data.org_id,
      service_type: data.service_type,
      country_code: data.service_type === 'LOCAL' ? data.country_code?.toUpperCase() : null,
      transport_mode: data.service_type === 'TOTAL' ? data.transport_mode?.toUpperCase() : null,
      origin_code: data.service_type === 'TOTAL' ? data.origin_code?.toUpperCase() : null,
      dest_code: data.service_type === 'TOTAL' ? data.dest_code?.toUpperCase() : null,
      currency: data.currency ?? 'USD',
      cost_per_kg: data.cost_per_kg ?? null,
      cost_per_cbm: data.cost_per_cbm ?? null,
      transit_days: data.transit_days ?? null,
      valid_from: data.valid_from,
      valid_until: data.valid_until ?? null,
      is_active: true,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) throw new Error(`배송 요율 등록 실패: ${error.message}`);

  revalidatePath('/admin/delivery-rates');
  return rate;
});

export const updateDeliveryRate = withAction(async function (id: string, data: Partial<CreateDeliveryRateData>) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || !canWriteDeliveryRates(profile.role)) {
    throw new Error("배송 서비스 요율 수정 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.DELIVERY_AGENT) {
    const { data: existing } = await supabase
      .from('zen_delivery_rates')
      .select('org_id')
      .eq('id', id)
      .single();

    if (existing && existing.org_id !== profile.org_id) {
      throw new Error("본인 조직의 요율만 수정할 수 있습니다.");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.org_id !== undefined) updateData.org_id = data.org_id;
  if (data.service_type !== undefined) updateData.service_type = data.service_type;
  if (data.country_code !== undefined) updateData.country_code = data.service_type === 'LOCAL' ? data.country_code?.toUpperCase() : null;
  if (data.transport_mode !== undefined) updateData.transport_mode = data.transport_mode?.toUpperCase();
  if (data.origin_code !== undefined) updateData.origin_code = data.origin_code?.toUpperCase();
  if (data.dest_code !== undefined) updateData.dest_code = data.dest_code?.toUpperCase();
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.cost_per_kg !== undefined) updateData.cost_per_kg = data.cost_per_kg;
  if (data.cost_per_cbm !== undefined) updateData.cost_per_cbm = data.cost_per_cbm;
  if (data.transit_days !== undefined) updateData.transit_days = data.transit_days;
  if (data.valid_from !== undefined) updateData.valid_from = data.valid_from;
  if (data.valid_until !== undefined) updateData.valid_until = data.valid_until;

  const { error } = await supabase
    .from('zen_delivery_rates')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`배송 요율 수정 실패: ${error.message}`);

  revalidatePath('/admin/delivery-rates');
  return true;
});

export async function getDeliveryRates(orgId?: string, serviceType?: 'LOCAL' | 'TOTAL') {
  const { supabase, profile } = await validateUserAction();

  let query = supabase
    .from('zen_delivery_rates')
    .select('*, zen_organizations!inner(name)')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  if (serviceType) {
    query = query.eq('service_type', serviceType);
  }

  if (profile?.role === USER_ROLES.DELIVERY_AGENT) {
    query = query.eq('org_id', profile.org_id);
  }

  if (profile?.role === USER_ROLES.CORPORATE || profile?.role === USER_ROLES.INDIVIDUAL || profile?.role === USER_ROLES.CARRIER) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("[ERROR] getDeliveryRates failed:", error);
    throw new Error(`배송 요율 조회 실패: ${error.message}`);
  }

  return data || [];
}

export const deleteDeliveryRate = withAction(async function (id: string) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || (profile.role !== USER_ROLES.ADMIN && profile.role !== USER_ROLES.MANAGER && profile.role !== USER_ROLES.DELIVERY_AGENT)) {
    throw new Error("배송 서비스 요율 삭제 권한이 없습니다.");
  }

  if (profile.role === USER_ROLES.DELIVERY_AGENT) {
    const { data: existing } = await supabase
      .from('zen_delivery_rates')
      .select('org_id')
      .eq('id', id)
      .single();

    if (existing && existing.org_id !== profile.org_id) {
      throw new Error("본인 조직의 요율만 삭제할 수 있습니다.");
    }
  }

  const { error } = await supabase
    .from('zen_delivery_rates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw new Error(`배송 요율 삭제 실패: ${error.message}`);

  revalidatePath('/admin/delivery-rates');
  return true;
});
