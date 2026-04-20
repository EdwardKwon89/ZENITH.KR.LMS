import { requireAdmin } from "@/lib/auth/guards";
import { getNations, getPorts } from "@/app/actions/master";
import GeoClient from "./geo-client";

export default async function GeoMasterPage() {
  // 1. 보안 검증
  await requireAdmin();

  // 2. 초기 데이터 로드 (국가 및 항구 병렬 로드)
  const [nations, ports] = await Promise.all([
    getNations(),
    getPorts()
  ]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
          지리 마스터 정보
        </h1>
        <p className="text-slate-500">
          전 세계 국가 정보와 주요 항구 및 공항 거점을 관리합니다.
        </p>
      </div>

      {/* 국가 및 항구 탭 통합 클라이언트 컴포넌트 */}
      <GeoClient initialNations={nations} initialPorts={ports} />
    </div>
  );
}
