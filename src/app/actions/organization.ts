"use server";

import { validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

/**
 * 신규 가입한 조직(화주/포워더 등)을 승인합니다.
 */
export async function approveOrganization(orgId: string) {
  const { supabase, user } = await validateAdminAction();

  // RPC를 통해 승인 처리 (Corporate ID 생성 및 Auth 메타데이터 동기화 포함)
  const { data: newId, error } = await supabase.rpc("approve_organization", {
    target_org_id: orgId
  });

  if (error) throw new Error(`Org approval RPC failed: ${error.message}`);

  console.log(`Organization ${orgId} approved by admin ${user.id}. Assigned ID: ${newId}`);

  revalidatePath("/admin/organizations");
  return { success: true, corporateId: newId };
}

/**
 * 가입 요청을 반려합니다.
 */
export async function rejectOrganization(orgId: string, reason: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase.rpc("reject_organization", {
    target_org_id: orgId,
    comment: reason
  });

  if (error) throw new Error(`Org rejection RPC failed: ${error.message}`);

  revalidatePath("/admin/organizations");
  return { success: true };
}

/**
 * [Ds-11 2.5] 조직 가입 신청 시 서류 보완을 요청합니다.
 */
export async function requestOrganizationSupplement(orgId: string, reason: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase.rpc("request_organization_supplement", {
    target_org_id: orgId,
    comment: reason
  });

  if (error) throw new Error(`Supplement request RPC failed: ${error.message}`);

  revalidatePath("/admin/organizations");
  return { success: true };
}

/**
 * 조직 목록을 조회합니다 (가입 대기 중인 조직 우선).
 */
export async function getOrganizations(status?: string | string[]) {
  const { supabase } = await validateAdminAction();

  let query = supabase
    .from("zen_organizations")
    .select(`
      *,
      zen_organization_documents(*)
    `);
  
  if (status) {
    if (Array.isArray(status)) {
      query = query.in("status", status);
    } else {
      query = query.eq("status", status);
    }
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);

  return data || [];
}

