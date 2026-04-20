"use server";

import { validateAdminAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

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
 * 모든 항구/공항 정보를 조회합니다.
 */
export async function getPorts() {
  const { supabase } = await validateAdminAction();
  
  const { data, error } = await supabase
    .from("ports")
    .select("*, nations(nation_name_ko, nation_name_en)")
    .order("port_code", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * 모든 조직(화주/파트너 등) 정보를 조회합니다.
 */
export async function getOrganizations() {
  const { supabase } = await validateAdminAction();
  
  const { data, error } = await supabase
    .from("zen_organizations")
    .select("*")
    .order("name", { ascending: true });

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
