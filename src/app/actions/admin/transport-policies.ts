"use server";

import { logger } from '@/lib/logger';
import { withAction } from '@/lib/actions/wrapper';
import { validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/auth/rbac";

export interface TransportPolicyData {
  transport_mode: 'AIR' | 'SEA' | 'LAND' | 'EXP';
  pricing_method: 'WEIGHT_ONLY' | 'VOLUMETRIC' | 'WM';
  volumetric_divisor: number | null;
  description: string | null;
  is_active: boolean;
}

export interface TransportPolicy extends TransportPolicyData {
  id: string;
  updated_at: string;
  updated_by: string | null;
}

function canWrite(role: string | undefined): boolean {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ZENITH_SUPER_ADMIN;
}

export async function getTransportPolicies(): Promise<TransportPolicy[]> {
  const { supabase } = await validateUserAction();

  const { data, error } = await supabase
    .from('zen_transport_pricing_policies')
    .select('*')
    .order('transport_mode');

  if (error) {
    logger.error("[ERROR] getTransportPolicies failed:", error);
    throw new Error(`운송 정책 조회 실패: ${error.message}`);
  }

  return data || [];
}

export const updateTransportPolicy = withAction(async function (id: string, data: Partial<TransportPolicyData>) {
  const { supabase, profile } = await validateUserAction();

  if (!profile || !canWrite(profile.role)) {
    throw new Error("운송 정책 수정 권한이 없습니다.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.pricing_method !== undefined) updateData.pricing_method = data.pricing_method;
  if (data.volumetric_divisor !== undefined) updateData.volumetric_divisor = data.volumetric_divisor;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  updateData.updated_by = profile.id;

  const { error } = await supabase
    .from('zen_transport_pricing_policies')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`운송 정책 수정 실패: ${error.message}`);

  revalidatePath('/admin/settings/transport-policies');
  return true;
});
