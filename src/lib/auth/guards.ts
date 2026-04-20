import { redirect } from "next/navigation";
import { checkPermission, USER_ROLES } from "./rbac";

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
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
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
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isAllowed = await checkPermission(profile?.role, "/admin");

  if (!isAllowed) {
    redirect("/");
  }

  return { user, profile };
}

/**
 * 서버 액션 전용 권한 검증 헬퍼입니다.
 */
export async function validateAdminAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAllowed = await checkPermission(profile?.role, "/admin");

  if (!isAllowed) {
    throw new Error("Unauthorized access");
  }

  return { user, profile, supabase };
}
