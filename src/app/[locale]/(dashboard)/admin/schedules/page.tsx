import { requireAdmin } from "@/lib/auth/guards";
import { getVesselSchedules } from "@/app/actions/schedules";
import { getPorts } from "@/app/actions/master";
import ScheduleClient from "./schedule-client";

export default async function SchedulesPage() {
  // 1. 보안 검증
  await requireAdmin();

  // 2. 초기 데이터 및 참조 데이터 로드
  const [schedules, ports] = await Promise.all([
    getVesselSchedules({}),
    getPorts(),
  ]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
          운항 스케줄 관리
        </h1>
        <p className="text-slate-500">
          선박/항공 운항 스케줄을 관리하고 최신 정보를 유지합니다.
        </p>
      </div>

      <ScheduleClient 
        initialData={schedules} 
        ports={ports} 
      />
    </div>
  );
}
