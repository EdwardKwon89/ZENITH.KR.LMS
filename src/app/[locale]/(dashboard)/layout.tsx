import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ZenShell from "@/components/layout/ZenShell";

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
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <ZenShell user={user} profile={profile}>
      {children}
    </ZenShell>
  );
}
