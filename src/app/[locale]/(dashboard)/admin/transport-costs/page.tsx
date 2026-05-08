import { requireAuth, checkPermission } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { getTransportCosts } from "@/app/actions/finance";
import { getPorts, getOrganizations } from "@/app/actions/master";
import TransportCostClient from "./transport-cost-client";

export default async function TransportCostsPage() {
  // 1. 보안 검증 (동적 권한 체크)
  const { profile } = await requireAuth();
  if (!checkPermission(profile?.role, "/admin/transport-costs")) {
    redirect("/");
  }

  // 2. 초기 데이터 및 참조 데이터 로드
  const [costs, ports, orgs] = await Promise.all([
    getTransportCosts(),
    getPorts(),
    getOrganizations(),
  ]);

  const carriers = orgs.filter((org: any) => org.type === 'CARRIER');

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
          운송 원가 관리
        </h1>
        <p className="text-slate-500">
          표준 운송 원가(Freight Rate) 및 부대 비용 정보를 관리합니다.
        </p>
      </div>

      <TransportCostClient 
        initialData={costs} 
        ports={ports} 
        carriers={carriers} 
      />
    </div>
  );
}
