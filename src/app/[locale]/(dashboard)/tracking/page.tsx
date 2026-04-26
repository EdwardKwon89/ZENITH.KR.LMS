import React from "react";
import TrackingDashboard from "@/components/tracking/TrackingDashboard";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "Common" });
  return {
    title: `Tracking Dashboard | ${t("title")}`,
  };
}

import { Map } from "lucide-react";

export default async function TrackingPage() {
  const t = await getTranslations("Navigation");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
          <Map size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("logistics_tracking")}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Monitor and manage all active logistics tracks and API sync status
          </p>
        </div>
      </div>

      <TrackingDashboard />
    </div>
  );
}
