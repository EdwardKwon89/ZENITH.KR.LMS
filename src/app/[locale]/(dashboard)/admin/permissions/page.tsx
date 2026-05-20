import { createClient } from "@/utils/supabase/server";
import { USER_ROLES, ALL_RESOURCE_PATHS } from "@/lib/auth/rbac";
import PermissionsClient from "./PermissionsClient";
import { redirect } from "next/navigation";

export default async function PermissionsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("zen_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== USER_ROLES.ZENITH_SUPER_ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-slate-500">Only Super Admins can manage permissions.</p>
      </div>
    );
  }

  // Fetch all current permissions
  const { data: currentPermissions } = await supabase
    .from("zen_role_permissions")
    .select("role_code, path");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">시스템 권한 관리</h1>
        <p className="text-slate-500">각 역할(Role)별로 접근 가능한 메뉴 및 경로를 설정합니다.</p>
      </div>

      <PermissionsClient 
        roles={Object.values(USER_ROLES)} 
        resources={ALL_RESOURCE_PATHS}
        initialPermissions={currentPermissions || []}
      />
    </div>
  );
}
