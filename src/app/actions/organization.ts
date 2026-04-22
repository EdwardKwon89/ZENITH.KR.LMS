"use server";

import { validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

/**
 * 신규 가입한 조직(화주/포워더 등)을 승인합니다.
 */
export async function approveOrganization(orgId: string) {
  const { supabase, user } = await validateAdminAction();

  // 1. 조직 상태 업데이트
  const { error: orgError } = await supabase
    .from("zen_organizations")
    .update({ 
      status: "ACTIVE",
      updated_at: new Date().toISOString()
    })
    .eq("id", orgId);

  if (orgError) throw new Error(`Org approval failed: ${orgError.message}`);

  // 2. 소속된 사용자들의 프로필 상태도 ACTIVE로 변경
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ status: "ACTIVE" })
    .eq("org_id", orgId);

  if (profileError) {
    console.error("Failed to update member profiles status:", profileError);
  }

  // 3. 감사 로그 기록 (선택 사항)
  console.log(`Organization ${orgId} approved by admin ${user.id}`);

  revalidatePath("/(admin)/organizations");
  return { success: true };
}

/**
 * 가입 요청을 반려합니다.
 */
export async function rejectOrganization(orgId: string, reason: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase
    .from("zen_organizations")
    .update({ 
      status: "REJECTED",
      remarks: `[REJECTED] ${reason}`,
      updated_at: new Date().toISOString()
    })
    .eq("id", orgId);

  if (error) throw new Error(`Org rejection failed: ${error.message}`);

  revalidatePath("/(admin)/organizations");
  return { success: true };
}

/**
 * [Ds-11 2.5] 조직 가입 신청 시 서류 보완을 요청합니다.
 */
export async function requestOrganizationSupplement(orgId: string, reason: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase
    .from("zen_organizations")
    .update({ 
      status: "PENDING_SUPPLEMENT",
      remarks: `[SUPPLEMENT REQUESTED] ${reason}`,
      updated_at: new Date().toISOString()
    })
    .eq("id", orgId);

  if (error) throw new Error(`Supplement request failed: ${error.message}`);

  revalidatePath("/(admin)/organizations");
  return { success: true };
}

/**
 * 조직 목록을 조회합니다 (가입 대기 중인 조직 우선).
 */
export async function getOrganizations(status?: string) {
  const { supabase } = await validateAdminAction();

  let query = supabase.from("zen_organizations").select("*");
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);

  return data || [];
}
