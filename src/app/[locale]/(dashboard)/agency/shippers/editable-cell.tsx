'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface EditableGradeCellProps {
  isEditing: boolean;
  value: string;
  onChange: (v: string) => void;
  displayValue: string | null;
  placeholder: string;
}

const GRADE_OPTIONS = ['', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export function EditableGradeCell({ isEditing, value, onChange, displayValue, placeholder }: EditableGradeCellProps) {
  if (isEditing) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-28 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
        {GRADE_OPTIONS.map((g) => (
          <option key={g} value={g}>{g || placeholder}</option>
        ))}
      </select>
    );
  }
  return <span className="text-slate-700">{displayValue || <span className="text-slate-400">{placeholder}</span>}</span>;
}

interface EditableRateCellProps {
  isEditing: boolean;
  value: number;
  onChange: (v: number) => void;
  displayRate: number;
}

export function EditableRateCell({ isEditing, value, onChange, displayRate }: EditableRateCellProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input type="number" value={value * 100} onChange={(e) => onChange(Number(e.target.value) / 100)}
          min={0} max={99.99} step={0.1}
          className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <span className="text-xs text-slate-400">%</span>
      </div>
    );
  }
  return <span className="text-slate-700">{(displayRate * 100).toFixed(1)}%</span>;
}

interface ActionCellProps {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  shipperId: string;
}

export function ActionCell({ isEditing, onEdit, onCancel, onSave, shipperId }: ActionCellProps) {
  const locale = useLocale();
  const router = useRouter();

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button onClick={onCancel} className="px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
        <button onClick={onSave} className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">저장</button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => router.push(`/${locale}/agency/shippers/${shipperId}/edit`)}
        className="px-2 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50">상세 편집</button>
      <button onClick={onEdit} className="px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">수정</button>
    </div>
  );
}
