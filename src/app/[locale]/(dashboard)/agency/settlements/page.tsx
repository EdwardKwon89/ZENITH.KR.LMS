import { requireAuth, checkPermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AgencySettlementClient } from "./AgencySettlementClient";
import { getAgencyShippers } from "@/app/actions/agency/shippers";

export default async function AgencySettlementsPage() {
  const { profile } = await requireAuth();
  if (!profile || !profile.org_id || !checkPermission(profile.role, "/agency")) {
    redirect("/");
  }

  const t = await getTranslations();
  const { shippers } = await getAgencyShippers(profile.org_id);

  return (
    <AgencySettlementClient
      agencyOrgId={profile.org_id}
      shippers={shippers || []}
    />
  );
}
