"use client";
import { logger } from '@/lib/logger';

import React, { useState, useEffect, useRef } from 'react';
import ZenDataGrid from '@/components/ui/ZenDataGrid';
import { ZenBadge, ZenButton, ZenSelect } from '@/components/ui/ZenUI';
import { ZenInput } from '@/components/ui/ZenInput';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle, AlertCircle, ShieldAlert, ExternalLink, User, Globe, Search } from 'lucide-react';
import { resolveErrorLog, getErrorLogs } from '@/app/actions/monitoring';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface ErrorLogsTableProps {
  initialLogs: any[];
  totalCount: number;
}

type SeverityFilter = 'ALL' | 'CRITICAL' | 'ERROR' | 'WARNING';
type StatusFilter = 'ALL' | 'OPEN' | 'RESOLVED';

const SEVERITY_OPTIONS = [
  { value: 'ALL', label: 'All Severities' },
  { value: 'CRITICAL', label: 'CRITICAL' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'WARNING', label: 'WARNING' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const PAGE_SIZE = 50;

export const ErrorLogsTable: React.FC<ErrorLogsTableProps> = ({ initialLogs, totalCount }) => {
  const t = useTranslations('Monitoring');
  const [logs, setLogs] = useState(initialLogs);
  const [isLoading, setIsLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const isFirstRender = useRef(true);

  const fetchLogs = React.useCallback(async (filters: {
    severity: SeverityFilter;
    status: StatusFilter;
    search: string;
  }) => {
    setIsLoading(true);
    try {
      const result = await getErrorLogs({
        page: 1,
        pageSize: PAGE_SIZE,
        severity: filters.severity === 'ALL' ? undefined : filters.severity,
        resolved: filters.status === 'ALL' ? undefined : filters.status === 'OPEN' ? false : true,
        search: filters.search.trim() || undefined,
      });
      setLogs(result.data);
    } catch (error) {
      logger.error('[ERROR_LOGS_TABLE] Failed to fetch logs:', error);
      toast.error('로그 조회에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchLogs({ severity: severityFilter, status: statusFilter, search: searchText });
    }, 400);
    return () => clearTimeout(timer);
  }, [severityFilter, statusFilter, searchText, fetchLogs]);

  const handleResolve = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: success, error } = await resolveErrorLog(id);
      if (error) {
        toast.error(error || '상태 변경에 실패했습니다.');
        return;
      }
      setLogs(prev => prev.map(log => 
        log.id === id ? { ...log, resolved: true } : log
      ));
      toast.success('에러 로그가 해결됨으로 표시되었습니다.');
      fetchLogs({ severity: severityFilter, status: statusFilter, search: searchText });
    } catch (error) {
      logger.error("Failed to resolve error log", error);
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

  // 상대 경로 등 URL 파싱 불가 문자열은 원본 그대로 표기 (TASK-1140: 렌더 크래시 방지)
  const getUrlDisplay = (rawUrl: string): string => {
    try {
      return new URL(rawUrl).pathname;
    } catch {
      return rawUrl;
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
                <Globe size={10} /> {getUrlDisplay(row.original.url)}
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
              onClick={() => window.open(`https://zenith-t2z.sentry.io/issues/?query=${row.original.sentry_id}`, '_blank')}
            >
              <ExternalLink size={14} className="text-slate-400 group-hover:text-white" />
            </ZenButton>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[200px_200px_1fr] gap-3">
        <ZenSelect
          value={severityFilter}
          onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}
          options={SEVERITY_OPTIONS}
          className="py-2.5 rounded-xl text-sm font-bold"
          aria-label="Severity filter"
        />
        <ZenSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          options={STATUS_OPTIONS}
          className="py-2.5 rounded-xl text-sm font-bold"
          aria-label="Status filter"
        />
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <ZenInput
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="메시지 키워드 검색..."
            className="py-2.5 pl-10 rounded-xl text-sm"
            aria-label="Keyword search"
          />
        </div>
      </div>
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
