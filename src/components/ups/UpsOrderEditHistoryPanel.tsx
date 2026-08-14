import React from 'react';
import { History } from 'lucide-react';
import { ORDER_EDIT_LOG_FIELD_LABELS } from '@/lib/orders/edit-log-fields';

// TASK-B-303 (Issue #1125): UPS 오더 상세의 "등록/수정 이력" 패널
// ZoneDiscountForm.tsx의 "변경 이력" 패널 스타일을 이식한 서버 컴포넌트.
// getOrderEditHistory() 결과를 그대로 받아 시간 역순으로 렌더한다.

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

function computeDiff(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) {
  const keys = new Set<string>([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);
  const entries: { key: string; oldValue: string; newValue: string }[] = [];
  for (const key of keys) {
    const oldVal = oldData?.[key] ?? null;
    const newVal = newData?.[key] ?? null;
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      entries.push({ key, oldValue: formatValue(oldVal), newValue: formatValue(newVal) });
    }
  }
  return entries;
}

function actionColor(action: string): string {
  if (action === 'CREATE') return 'text-green-600';
  if (action === 'UPDATE') return 'text-blue-600';
  if (action === 'CANCEL') return 'text-red-600';
  if (action === 'APPLY') return 'text-purple-600';
  return 'text-orange-600';
}

export default function UpsOrderEditHistoryPanel({ history }: UpsOrderEditHistoryPanelProps) {
  if (!history || history.length === 0) return null;

  return (
    <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-amber-500" />
        등록/수정 이력 ({history.length}건)
      </h3>
      <div className="max-h-64 overflow-y-auto">
        <div className="space-y-1.5">
          {history.map((entry) => {
            const diffs = computeDiff(entry.old_data, entry.new_data);
            const isCreate = entry.action === 'CREATE';
            return (
              <div key={entry.id} className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-bold ${actionColor(entry.action)}`}>{entry.action}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {entry.operator?.full_name ?? '시스템'}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700">
                      {entry.order_status_at_edit}
                    </span>
                  </div>
                  <span className="text-slate-400 whitespace-nowrap">
                    {new Date(entry.edited_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {diffs.length === 0 && (
                    <span className="text-slate-400">변경사항 없음</span>
                  )}
                  {diffs.map((d) => (
                    <div key={d.key} className="flex items-start gap-1">
                      <span className="text-slate-500 shrink-0">{ORDER_EDIT_LOG_FIELD_LABELS[d.key] ?? d.key}:</span>
                      {isCreate ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.newValue}</span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-200 break-all">
                          <span className="text-slate-400 line-through">{d.oldValue}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="font-bold">{d.newValue}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}