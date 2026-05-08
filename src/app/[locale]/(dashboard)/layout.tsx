import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ZenShell from "@/components/layout/ZenShell";
import GlobalHeader from "@/components/layout/GlobalHeader";
import NaviSidebar from "@/components/layout/NaviSidebar";
import { getPermissionsByRole } from "@/lib/auth/rbac";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch detailed profile info if needed (for business name, etc.)
  const { data: profile } = await supabase
    .from("zen_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // [RBAC] Fetch dynamic permissions from DB (Centralized & Cached)
  const allowedPaths = await getPermissionsByRole(supabase, profile?.role || "GUEST");

  return (
    <ZenShell 
      user={user} 
      profile={profile}
      header={<GlobalHeader user={user} profile={profile} />}
      sidebar={<NaviSidebar user={user} profile={profile} allowedPaths={allowedPaths} />}
    >
      {children}
    </ZenShell>
  );
}
