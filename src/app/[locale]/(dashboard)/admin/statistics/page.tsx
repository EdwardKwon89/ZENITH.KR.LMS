import { requireAdmin } from "@/lib/auth/guards";
import { getCostProfitStats } from "@/app/actions/statistics";
import StatisticsClient from "./statistics-client";

export default async function StatisticsPage() {
  // 1. 보안 검증
  await requireAdmin();

  // 2. 초기 데이터 로드 (기본 MONTH)
  const stats = await getCostProfitStats('MONTH');

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
          수익성 및 운송 통계
        </h1>
        <p className="text-slate-500">
          모드별 매출, 원가 및 수익률 지표를 시각화하여 분석합니다.
        </p>
      </div>

      <StatisticsClient initialData={stats} />
    </div>
  );
}
