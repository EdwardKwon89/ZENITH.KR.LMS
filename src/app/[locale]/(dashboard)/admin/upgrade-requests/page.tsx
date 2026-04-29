import { requireAdmin } from "@/lib/auth/guards";
import { getGradePromotionRequests } from "@/app/actions/member";
import UpgradeRequestClient from "./upgrade-request-client";

export default async function UpgradeRequestsPage() {
  await requireAdmin();

  const { requests } = await getGradePromotionRequests(); // status 필터 제거 → 전체 조회

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
          등급 승급 심사 관리
        </h1>
        <p className="text-slate-500">
          사용자들의 등급 승급 신청 내역을 검토하고 승인 또는 반려합니다.
        </p>
      </div>

      <UpgradeRequestClient initialData={requests} />
    </div>
  );
}
