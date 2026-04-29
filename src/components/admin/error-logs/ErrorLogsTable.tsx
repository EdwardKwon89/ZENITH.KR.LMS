"use client";

import React, { useState } from 'react';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { ZenBadge, ZenButton } from '@/components/ui/ZenUI';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle, AlertCircle, ShieldAlert, ExternalLink, User, Globe } from 'lucide-react';
import { resolveErrorLog } from '@/app/actions/monitoring';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface ErrorLogsTableProps {
  initialLogs: any[];
  totalCount: number;
}

export const ErrorLogsTable: React.FC<ErrorLogsTableProps> = ({ initialLogs, totalCount }) => {
  const t = useTranslations('Monitoring');
  const [logs, setLogs] = useState(initialLogs);
  const [isLoading, setIsLoading] = useState(false);

  const handleResolve = async (id: string) => {
    setIsLoading(true);
    try {
      await resolveErrorLog(id);
      setLogs(prev => prev.map(log => 
        log.id === id ? { ...log, resolved: true } : log
      ));
      toast.success('에러 로그가 해결됨으로 표시되었습니다.');
    } catch (error) {
      console.error("Failed to resolve error log", error);
      toast.error('상태 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'ERROR': return 'warning';
      case 'WARNING': return 'info';
      default: return 'default';
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      header: 'Severity',
      accessorKey: 'severity',
      cell: ({ row }) => (
        <ZenBadge variant={getSeverityVariant(row.original.severity)} className="font-black text-[10px] px-3">
          {row.original.severity}
        </ZenBadge>
      )
    },
    {
      header: 'Error Message',
      accessorKey: 'message',
      cell: ({ row }) => (
        <div className="flex flex-col max-w-[400px]">
          <span className="font-bold text-slate-900 truncate" title={row.original.message}>
            {row.original.message}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono uppercase tracking-tighter">
              {row.original.error_type}
            </span>
            {row.original.url && (
              <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <Globe size={10} /> {new URL(row.original.url).pathname}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Context',
      id: 'context',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-600">
            <User size={14} className="text-slate-400" />
            <span className="text-xs font-medium">
              {row.original.user?.full_name || row.original.user?.email || 'Anonymous'}
            </span>
          </div>
          {row.original.sentry_id && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-indigo-500">
              <ShieldAlert size={12} />
              <span>SENTRY: {row.original.sentry_id.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Created At',
      accessorKey: 'created_at',
      cell: ({ row }) => (
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
          {format(new Date(row.original.created_at), 'yyyy.MM.dd HH:mm:ss')}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'resolved',
      cell: ({ row }) => (
        row.original.resolved ? (
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
            <CheckCircle size={14} />
            <span>Resolved</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
            <AlertCircle size={14} />
            <span>Open</span>
          </div>
        )
      )
    },
    {
      header: 'Control',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {!row.original.resolved && (
            <ZenButton 
              variant="glass" 
              className="px-3 py-1.5 h-8 text-[11px] font-black rounded-lg border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
              onClick={() => handleResolve(row.original.id)}
              loading={isLoading}
            >
              Resolve
            </ZenButton>
          )}
          {row.original.sentry_id && (
            <ZenButton 
              variant="tactile" 
              className="p-1.5 h-8 w-8 rounded-lg bg-slate-100 border-none shadow-sm hover:bg-indigo-500 group transition-all"
              onClick={() => window.open(`https://sentry.io/organizations/zenith-lms/issues/?query=${row.original.sentry_id}`, '_blank')}
            >
              <ExternalLink size={14} className="text-slate-400 group-hover:text-white" />
            </ZenButton>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="w-full">
      <ZenDataGrid 
        columns={columns} 
        data={logs} 
        title="Error Logs"
        description="시스템 전반에서 수집된 런타임 에러 로그입니다."
        loading={isLoading}
      />
    </div>
  );
};
