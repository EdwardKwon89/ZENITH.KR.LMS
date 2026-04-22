"use server";

import { validateAdminAction, validateUserAction } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { 
  portSchema, 
  PortInput, 
  commonCodeSchema, 
  CommonCodeInput 
} from "@/lib/validation/master-data";

/**
 * 항구 정보를 등록하거나 수정합니다.
 */
export async function upsertPort(payload: PortInput) {
  const { supabase } = await validateAdminAction();
  const validated = portSchema.parse(payload);

  const { data, error } = await supabase
    .from("zen_ports")
    .upsert({
      ...validated,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Port upsert failed: ${error.message}`);

  revalidatePath("/(admin)/settings/ports");
  return { success: true, data };
}

/**
 * 항구 목록을 조회합니다.
 */
export async function getPorts(activeOnly = true) {
  const { supabase } = await validateAdminAction();
  
  let query = supabase.from("zen_ports").select("*");
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query.order("code", { ascending: true });
  if (error) throw new Error(`Failed to fetch ports: ${error.message}`);

  return data || [];
}

/**
 * [Ds-11 7.2] 국가 목록을 조회합니다.
 */
export async function getNations() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from("zen_nations")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to fetch nations: ${error.message}`);
  return data || [];
}

/**
 * [Ds-11 7.3] 등록된 모든 조직(화주/파트너 등) 목록을 조회합니다.
 */
export async function getOrganizations() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from("zen_organizations")
    .select("*")
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);
  return data || [];
}

/**
 * [Ds-11 7.3] 항공사(IATA 코드가 있는 CARRIER) 목록을 조회합니다.
 */
export async function getAirlines() {
  const { supabase } = await validateUserAction();
  const { data, error } = await supabase
    .from("zen_organizations")
    .select("*")
    .eq("org_type", "CARRIER")
    .not("iata_code", "is", null)
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to fetch airlines: ${error.message}`);
  return data || [];
}

/**
 * 시스템 공통코드를 등록하거나 수정합니다.
 */
export async function upsertCommonCode(payload: CommonCodeInput) {
  const { supabase } = await validateAdminAction();
  const validated = commonCodeSchema.parse(payload);

  const { data, error } = await supabase
    .from("zen_common_codes")
    .upsert({
      ...validated,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error(`Common code upsert failed: ${error.message}`);

  revalidatePath("/(admin)/settings/codes");
  return { success: true, data };
}

/**
 * 특정 카테고리의 공통코드를 조회합니다.
 */
export async function getCommonCodes(category: string, activeOnly = true) {
  const { supabase } = await validateAdminAction();

  let query = supabase
    .from("zen_common_codes")
    .select("*")
    .eq("category", category);
    
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch codes: ${error.message}`);

  return data || [];
}

/**
 * [Ds-11 7.5] 특정 그룹의 활성 공통코드만 조회합니다. (UI 컴포넌트용)
 */
export async function getCommonCodesByGroup(groupCode: string) {
  return getCommonCodes(groupCode, true);
}

/**
 * [Ds-11 7.6] 공통코드를 삭제합니다.
 */
export async function deleteCommonCode(id: string) {
  const { supabase } = await validateAdminAction();

  const { error } = await supabase
    .from("zen_common_codes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Common code deletion failed: ${error.message}`);

  revalidatePath("/(admin)/settings/codes");
  return { success: true };
}
