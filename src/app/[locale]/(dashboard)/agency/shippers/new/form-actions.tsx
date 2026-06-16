'use client';

import Link from 'next/link';

interface FormActionsProps {
  loading: boolean;
  submitLabel: string;
  loadingLabel: string;
}

export function FormActions({ loading, submitLabel, loadingLabel }: FormActionsProps) {
  return (
    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
      <Link href="/agency/shippers"
        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">취소</Link>
      <button type="submit" disabled={loading}
        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20">
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  );
}
