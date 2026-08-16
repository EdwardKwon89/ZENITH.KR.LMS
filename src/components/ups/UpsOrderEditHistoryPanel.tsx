'use client';

import React, { useState } from 'react';
import { History, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ORDER_EDIT_LOG_FIELD_LABELS,
  ORDER_EDIT_LOG_FIELD_GROUPS,
  ORDER_EDIT_LOG_ACTION_LABELS,
  computeGroupChanges,
} from '@/lib/orders/edit-log-fields';

// TASK-B-310 (Issue #1143): 등록/수정 이력 패널 — 그룹 카드 + 클릭 상세보기 재설계

interface OrderEditHistoryEntry {
  id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  order_status_at_edit: string;
  edited_at: string;
  operator: { full_name: string } | null;
}

interface UpsOrderEditHistoryPanelProps {
  history: OrderEditHistoryEntry[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  const s = String(value);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

function actionColor(action: string): string {
  if (action === 'CREATE') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (action === 'UPDATE') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (action === 'CANCEL') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (action === 'APPLY') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
}

function HistoryCard({ entry }: { entry: OrderEditHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isCreate = entry.action === 'CREATE';
  const groupChanges = computeGroupChanges(entry.old_data, entry.new_data, isCreate);
  const actionLabel = ORDER_EDIT_LOG_ACTION_LABELS[entry.action] ?? entry.action;
  const relativeTime = formatDistanceToNow(new Date(entry.edited_at), { addSuffix: true, locale: ko });

  return (
    <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
      {/* 카드 요약 — 클릭 시 펼침/접힘 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${actionColor(entry.action)}`}>
              {actionLabel}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {entry.operator?.full_name ?? '시스템'}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700">
              {entry.order_status_at_edit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400" title={new Date(entry.edited_at).toLocaleString('ko-KR')}>
              {relativeTime}
            </span>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* 변경된 그룹 배지 — TASK-B-310: CREATE는 "N건 등록", UPDATE는 "N건 변경" */}
        {groupChanges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {groupChanges.map((g) => (
              <span
                key={g.groupKey}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
              >
                {g.groupLabel} {g.changedFields.length}건 {isCreate ? '등록' : '변경'}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* 아코디언 상세 — 그룹별 필드 diff */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-zinc-800 p-3 space-y-3">
          {groupChanges.length === 0 ? (
            <span className="text-xs text-slate-400">변경사항 없음</span>
          ) : (
            groupChanges.map((group) => (
              <div key={group.groupKey}>
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {group.groupLabel}
                </h4>
                <div className="space-y-1">
                  {group.changedFields.map((fieldKey) => {
                    const oldVal = entry.old_data?.[fieldKey] ?? null;
                    const newVal = entry.new_data?.[fieldKey] ?? null;
                    return (
                      <div key={fieldKey} className="flex items-start gap-1 text-[11px]">
                        <span className="text-slate-500 shrink-0">{ORDER_EDIT_LOG_FIELD_LABELS[fieldKey] ?? fieldKey}:</span>
                        {isCreate ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatValue(newVal)}</span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-200 break-all">
                            <span className="text-slate-400 line-through">{formatValue(oldVal)}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="font-bold">{formatValue(newVal)}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function UpsOrderEditHistoryPanel({ history }: UpsOrderEditHistoryPanelProps) {
  if (!history || history.length === 0) return null;

  return (
    <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-amber-500" />
        등록/수정 이력 ({history.length}건)
      </h3>
      <div className="max-h-96 overflow-y-auto space-y-2">
        {history.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
