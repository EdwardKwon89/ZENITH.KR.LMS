import React from 'react';
import { getErrorLogs } from '@/app/actions/monitoring';
import { ErrorLogsTable } from '@/components/admin/error-logs/ErrorLogsTable';
import { ZenAurora } from '@/components/ui/ZenUI';

export const dynamic = 'force-dynamic';

export default async function AdminErrorLogsPage() {
  const { data: logs, count } = await getErrorLogs({
    page: 1,
    pageSize: 50
  });

  return (
    // TASK-1147 (Issue #1222, DEF-140): 루트 자체 패딩(p-6 md:p-10) 제거 —
    // (dashboard) 레이아웃 <main>의 공통 패딩과 중복되어 다른 화면보다
    // 좌측 여백이 40px 넓어지던 이중 패딩 해소. space-y 리듬은 유지.
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight font-heading">
            System Monitoring
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            실시간 시스템 에러 로그 및 Sentry 연동 관리
          </p>
        </div>
      </div>

      <ErrorLogsTable initialLogs={logs} totalCount={count} />
    </div>
  );
}
