import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkPermission, USER_ROLES } from "./rbac";
export { checkPermission };

/**
 * 일반적인 인증을 강제하는 서버사이드 보안 가드입니다.
 * 세션이 없을 경우 로그인 페이지로 리다이렉트합니다.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("zen_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile, supabase };
}

/**
 * 관리자급 이상 권한을 강제하는 서버사이드 보안 가드입니다.
 * ZENITH_SUPER_ADMIN, ADMIN, MANAGER 역할을 수용합니다.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("zen_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAllowed = checkPermission(profile?.role, "/admin");
  console.log(`[AUTH_DEBUG] requireAdmin: email=${user.email}, role=${profile?.role}, isAllowed=${isAllowed}`);

  if (!isAllowed) {
    redirect("/");
  }

  return { user, profile, supabase };
}

/**
 * 서버 액션 전용 권한 검증 헬퍼입니다.
 */
export async function validateAdminAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
    throw new Error("Login required");
  }

  const { data: profile } = await supabase
    .from("zen_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAllowed = checkPermission(profile?.role, "/admin");
  console.log(`[AUTH_TRACE] User: ${user.email}, Role: ${profile?.role}, Path: /admin, Allowed: ${isAllowed}`);

  if (!isAllowed) {
    console.error(`[AUTH_DENIED] Access blocked for ${user.email} (Role: ${profile?.role})`);
    throw new Error("Unauthorized access");
  }

  return { user, profile, supabase };
}

/**
 * 일반 사용자 세션을 검증하는 서버 액션용 가드입니다.
 */
export async function validateUserAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("[AUTH_REQUIRED] Session not found");
    throw new Error("Login required");
  }

  const { data: profile } = await supabase
    .from("zen_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile, supabase };
}
