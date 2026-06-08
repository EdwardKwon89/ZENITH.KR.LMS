import { logger } from '@/lib/logger';
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
    .select('id, email, role, org_id, status, full_name')
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
    .select('id, email, role, org_id, status, full_name')
    .eq("id", user.id)
    .single();

  let orgType = 'GUEST';
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("zen_organizations")
      .select('type')
      .eq('id', profile.org_id)
      .single();
    if (org) {
      orgType = org.type;
    }
  }
  const isPlatformAdmin = 
    profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN || 
    (profile?.role === USER_ROLES.ADMIN && orgType === 'PLATFORM');

  const isAllowed = isPlatformAdmin || checkPermission(profile?.role, "/admin");
  logger.info(`[AUTH_DEBUG] requireAdmin: email=${user.email}, role=${profile?.role}, orgType=${orgType}, isAllowed=${isAllowed}`);

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
    .select('id, email, role, org_id, status, full_name')
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  let orgType = 'GUEST';
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("zen_organizations")
      .select('type')
      .eq('id', profile.org_id)
      .single();
    if (org) {
      orgType = org.type;
    }
  }
  const isPlatformAdmin = 
    profile?.role === USER_ROLES.ZENITH_SUPER_ADMIN || 
    (profile?.role === USER_ROLES.ADMIN && orgType === 'PLATFORM');

  const isAllowed = isPlatformAdmin || checkPermission(profile?.role, "/admin");
  logger.info(`[AUTH_TRACE] User: ${user.email}, Role: ${profile?.role}, orgType=${orgType}, Path: /admin, Allowed: ${isAllowed}`);

  if (!isAllowed) {
    logger.error(`[AUTH_DENIED] Access blocked for ${user.email} (Role: ${profile?.role}, OrgType: ${orgType})`);
    throw new Error("Unauthorized access");
  }

  return { user, profile, supabase };
}

/**
 * 일반 사용자 세션을 검증하는 서버 액션용 가드입니다.
 */
export async function validateUserAction() {
  logger.info("[DEBUG] validateUserAction START");
  const supabase = await createClient();
  logger.info("[DEBUG] validateUserAction: Supabase client created");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  logger.info("[DEBUG] validateUserAction: getUser result", { hasUser: !!user, email: user?.email, error: authError });

  if (!user) {
    logger.error("[AUTH_REQUIRED] Session not found");
    throw new Error("Login required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("zen_profiles")
    .select('id, email, role, org_id, status, full_name, phone_number')
    .eq("id", user.id)
    .single();
    
  logger.info("[DEBUG] validateUserAction: profile result", { hasProfile: !!profile, error: profileError });

  if (!profile) throw new Error("Profile not found");

  return { user, profile, supabase };
}

