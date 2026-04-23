import React from "react";
import TrackingDashboard from "@/components/tracking/TrackingDashboard";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "Common" });
  return {
    title: `Tracking Dashboard | ${t("title")}`,
  };
}

export default async function TrackingPage() {
  const t = await getTranslations("Navigation");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t("logistics_tracking")}
        </h1>
        <p className="text-sm text-slate-500">
          Monitor and manage all active logistics tracks and API sync status.
        </p>
      </div>

      <TrackingDashboard />
    </div>
  );
}
