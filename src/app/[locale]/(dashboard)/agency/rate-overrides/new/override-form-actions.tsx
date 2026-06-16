'use client';

import { useRouter } from 'next/navigation';

interface OverrideFormActionsProps {
  loading: boolean;
  submitLabel: string;
}

export function OverrideFormActions({ loading, submitLabel }: OverrideFormActionsProps) {
  const router = useRouter();

  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={() => router.back()}
        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">취소</button>
      <button type="submit" disabled={loading}
        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20">
        {loading ? '...' : submitLabel}
      </button>
    </div>
  );
}