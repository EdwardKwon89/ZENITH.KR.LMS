import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireAuth, checkPermission } from "@/lib/auth/guards";
import { getAgencyShippers } from "@/app/actions/agency/shippers";
import { AgencyDashboardStats } from "./AgencyDashboardStats";
import { AgencyQuickLinks } from "./AgencyQuickLinks";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AgencyDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const { profile } = await requireAuth();

  if (!profile || !checkPermission(profile.role, "/agency")) {
    redirect("/");
  }

  const t = await getTranslations();
  const { shippers } = await getAgencyShippers(profile.org_id);
  const shipperCount = shippers?.length || 0;

  return (
    <div className="flex-1 flex flex-col gap-8 p-4 md:p-8 min-h-screen bg-slate-50/30 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-50 px-2.5 py-1 rounded-full w-fit">
          {t("agency_console_badge")}
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2">
          {t("agency_dashboard")}
        </h1>
        <p className="text-sm text-slate-500">
          {t("agency_console_desc")}
        </p>
      </header>

      <AgencyDashboardStats shipperCount={shipperCount} ordersCount={0} t={t} />
      <AgencyQuickLinks locale={locale} t={t} />
    </div>
  );
}
