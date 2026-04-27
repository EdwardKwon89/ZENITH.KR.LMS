import React from "react";
import { getTranslations } from "next-intl/server";
import { WalletDashboard } from "@/components/wallet/WalletDashboard";

interface MyPageProps {
  params: {
    locale: string;
  };
}

export default async function MyPage({ params }: MyPageProps) {
  const { locale } = await params;
  const t = await getTranslations("Wallet");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-950 tracking-tight">
            {t("my_page")}
          </h1>
          <p className="text-slate-500 mt-1">{t("my_page_desc")}</p>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="grid grid-cols-1 gap-8">
        <WalletDashboard />
      </div>
    </div>
  );
}
