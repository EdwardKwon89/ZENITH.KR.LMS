'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface EditableGradeCellProps {
  displayValue: string | null;
  placeholder: string;
}

export function EditableGradeCell({ displayValue, placeholder }: EditableGradeCellProps) {
  return <span className="text-slate-700">{displayValue || <span className="text-slate-400">{placeholder}</span>}</span>;
}

interface EditableRateCellProps {
  displayRate: number;
}

export function EditableRateCell({ displayRate }: EditableRateCellProps) {
  return <span className="text-slate-700">{(displayRate * 100).toFixed(1)}%</span>;
}

interface ActionCellProps {
  shipperId: string;
}

export function ActionCell({ shipperId }: ActionCellProps) {
  const locale = useLocale();
  const router = useRouter();

  return (
    <div className="flex items-center justify-end">
      <button onClick={() => router.push(`/${locale}/agency/shippers/${shipperId}/edit`)}
        className="px-2 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50">상세 편집</button>
    </div>
  );
}
