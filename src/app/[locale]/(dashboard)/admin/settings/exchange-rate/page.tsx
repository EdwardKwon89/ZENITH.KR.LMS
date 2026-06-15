import { requireAdmin } from "@/lib/auth/guards";
import { getExchangeRateSettings } from "@/app/actions/admin/settings";
import ExchangeRateClient from "./exchange-rate-client";

export default async function AdminExchangeRatePage() {
  // 1. 보안 검증 (ADMIN 권한 체크)
  await requireAdmin();

  // 2. 초기 데이터 로드 (기준 통화 및 환율 목록)
  const initialData = await getExchangeRateSettings();

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 min-h-screen">
      <ExchangeRateClient initialData={initialData} />
    </div>
  );
}
