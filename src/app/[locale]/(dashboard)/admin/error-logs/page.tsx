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
    <div className="p-6 md:p-10 space-y-8">
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
