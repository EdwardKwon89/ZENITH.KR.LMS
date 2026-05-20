"use server";

import { revalidatePath } from "next/cache";
import { validateUserAction } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/auth/rbac";

/**
 * 1. 법인 조직 정보 조회
 */
export async function getOrganizationInfo() {
  const { profile, supabase } = await validateUserAction();
  
  if (!profile?.org_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("zen_organizations")
    .select('id, name, metadata')
    .eq("id", profile.org_id)
    .single();

  if (error) {
    console.error("Error fetching organization info:", error);
    throw new Error("조직 정보를 불러오는 데 실패했습니다.");
  }

  return data;
}

/**
 * 2. 법인 조직 정보(metadata) 수정
 */
export async function updateOrganizationInfo(payload: {
  representative?: string;
  bizNo?: string;
  address?: string;
  contact?: string;
  email?: string;
}) {
  const { profile, supabase } = await validateUserAction();

  if (profile.role !== USER_ROLES.CORPORATE && profile.role !== USER_ROLES.ADMIN) {
    throw new Error("조직 정보를 수정할 권한이 없습니다.");
  }

  if (!profile.org_id) {
    throw new Error("소속된 조직 정보가 없습니다.");
  }

  // 기존 metadata 가져오기
  const { data: org } = await supabase
    .from("zen_organizations")
    .select("metadata")
    .eq("id", profile.org_id)
    .single();

  const newMetadata = {
    ...(org?.metadata || {}),
    ...payload
  };

  const { error } = await supabase
    .from("zen_organizations")
    .update({ metadata: newMetadata })
    .eq("id", profile.org_id);

  if (error) {
    console.error("Error updating organization info:", error);
    throw new Error("조직 정보 저장 중 오류가 발생했습니다.");
  }

  revalidatePath("/mypage/corporate");
  return { success: true };
}

/**
 * 3. 부서 목록 조회
 */
export async function getDepartments() {
  const { profile, supabase } = await validateUserAction();

  if (!profile?.org_id) {
    return [];
  }

  const { data, error } = await supabase
    .from("zen_departments")
    .select('id, name, created_at')
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching departments:", error);
    throw new Error("부서 목록을 불러오는 데 실패했습니다.");
  }

  return data || [];
}

/**
 * 4. 부서 추가
 */
export async function createDepartment(name: string) {
  const { profile, supabase } = await validateUserAction();

  if (profile.role !== USER_ROLES.CORPORATE && profile.role !== USER_ROLES.ADMIN) {
    throw new Error("부서 관리 권한이 없습니다.");
  }

  if (!profile.org_id) {
    throw new Error("소속된 조직 정보가 없습니다.");
  }

  const { error } = await supabase
    .from("zen_departments")
    .insert({
      org_id: profile.org_id,
      name
    });

  if (error) {
    console.error("Error creating department:", error);
    throw new Error("부서 추가 중 오류가 발생했습니다.");
  }

  revalidatePath("/mypage/corporate");
  return { success: true };
}

/**
 * 5. 부서 수정
 */
export async function updateDepartment(id: string, name: string) {
  const { profile, supabase } = await validateUserAction();

  if (profile.role !== USER_ROLES.CORPORATE && profile.role !== USER_ROLES.ADMIN) {
    throw new Error("부서 관리 권한이 없습니다.");
  }

  if (!profile.org_id) {
    throw new Error("소속된 조직 정보가 없습니다.");
  }

  const { error } = await supabase
    .from("zen_departments")
    .update({ name })
    .eq("id", id)
    .eq("org_id", profile.org_id);

  if (error) {
    console.error("Error updating department:", error);
    throw new Error("부서 수정 중 오류가 발생했습니다.");
  }

  revalidatePath("/mypage/corporate");
  return { success: true };
}

/**
 * 6. 부서 삭제
 */
export async function deleteDepartment(id: string) {
  const { profile, supabase } = await validateUserAction();

  if (profile.role !== USER_ROLES.CORPORATE && profile.role !== USER_ROLES.ADMIN) {
    throw new Error("부서 관리 권한이 없습니다.");
  }

  if (!profile.org_id) {
    throw new Error("소속된 조직 정보가 없습니다.");
  }

  const { error } = await supabase
    .from("zen_departments")
    .delete()
    .eq("id", id)
    .eq("org_id", profile.org_id);

  if (error) {
    console.error("Error deleting department:", error);
    throw new Error("부서 삭제 중 오류가 발생했습니다.");
  }

  revalidatePath("/mypage/corporate");
  return { success: true };
}
