"use server";

import { validateAdminAction, validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { SYSTEM_INDIVIDUAL_SHIPPER_ID } from "@/lib/constants";

/**
 * 하우스 오더 번호를 생성합니다.
 * 형식: {Prefix}-{YYYY}-{6자리 시퀀스}
 */
export async function generateOrderNo(supabase: any) {
  const year = new Date().getFullYear();
  const prefix = "ZEN";

  const { data, error } = await supabase.rpc("get_next_order_sequence", {
    p_year: year.toString(),
    p_prefix: prefix
  });

  if (error) {
    console.error("Sequence error:", error);
    // 폴백: 타임스탬프와 랜덤 숫자로 임시 생성
    return `${prefix}-${year}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  return data;
}

/**
 * 마스터 오더 번호를 생성합니다. (WBS 2.2)
 * 형식: M-YYMMDD-NNNN (SQL Function 호출)
 */
export async function generateMasterOrderNo(supabase: any) {
  const { data, error } = await supabase.rpc("generate_master_order_no");

  if (error) {
    console.error("Master Sequence error:", error);
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `M${datePart}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return data;
}


/**
 * 모든 항구/공항 정보를 조회합니다. (ZEN 기반 마스터 데이터)
 */
export async function getPorts() {
  const { supabase } = await validateUserAction();
  
  const { data, error } = await supabase
    .from("zen_ports")
    .select("*")
    .order("code", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * 특정 항구 정보를 추가하거나 업데이트합니다.
 */
export async function upsertPort(payload: any) {
  const { supabase } = await validateAdminAction();
  
  const { data, error } = await supabase
    .from("zen_ports")
    .upsert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath("/(dashboard)/master/geo", "page");
  return data;
}

/**
 * 모든 국가/지역 정보를 조회합니다.
 */
export async function getNations() {
  const { supabase } = await validateUserAction();
  
  const { data, error } = await supabase
    .from("zen_nations")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * 모든 조직(화주/파트너 등) 정보를 조회합니다.
 */
export async function getOrganizations() {
  const { supabase } = await validateUserAction();
  
  const { data, error } = await supabase
    .from("zen_organizations")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}
/**
 * 모든 공통 코드 목록을 조회합니다.
 */
export async function getCommonCodes() {
  const { supabase } = await validateAdminAction();
  
  const { data, error } = await supabase
    .from("common_codes")
    .select("*")
    .order("group_code", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * 특정 그룹의 공통 코드 목록을 조회합니다.
 */
export async function getCommonCodesByGroup(groupCode: string) {
  const { supabase } = await validateAdminAction();
  
  const { data, error } = await supabase
    .from("common_codes")
    .select("*")
    .eq("group_code", groupCode)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * 공통 코드를 생성하거나 업데이트합니다.
 */
export async function upsertCommonCode(payload: any) {
  const { supabase } = await validateAdminAction();
  
  const { data, error } = await supabase
    .from("common_codes")
    .upsert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  revalidatePath("/(dashboard)/master/codes", "page");
  return data;
}

/**
 * 공통 코드를 삭제(비활성화 추천)합니다.
 */
export async function deleteCommonCode(id: string) {
  const { supabase } = await validateAdminAction();
  
  const { error } = await supabase
    .from("common_codes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  
  revalidatePath("/(dashboard)/master/codes", "page");
  return { success: true };
}

/**
 * 현재 로그인한 사용자의 소속 및 권한 컨텍스트를 조회합니다.
 */
export async function getCurrentUserAffiliation() {
  const { profile, supabase } = await validateUserAction();

  let orgData = null;
  if (profile?.org_id) {
    // organizations(Legacy)와 zen_organizations(Modern) 모두 조회하여 데이터 병합
    const [legacyRes, modernRes] = await Promise.all([
      supabase.from("organizations").select("org_name_ko, address, biz_no").eq("id", profile.org_id).single(),
      supabase.from("zen_organizations").select("name").eq("id", profile.org_id).single()
    ]);
    
    orgData = {
      name: legacyRes.data?.org_name_ko || modernRes.data?.name || "Unknown Org",
      address: legacyRes.data?.address,
      bizNo: legacyRes.data?.biz_no
    };
  }

  return {
    userId: profile?.id,
    userName: profile?.full_name || "Unknown User",
    userEmail: profile?.email,
    role: profile?.role,
    orgId: profile?.org_id,
    orgName: orgData?.name || null,
    orgAddress: orgData?.address,
    orgBizNo: orgData?.bizNo,
    isIndividual: !profile?.org_id,
    dummyIndividualId: SYSTEM_INDIVIDUAL_SHIPPER_ID
  };
}
