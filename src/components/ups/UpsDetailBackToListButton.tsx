'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// TASK-B-301 (Issue #1121): 진입 직전 목록 화면으로 복귀 (router.back())
export default function UpsDetailBackToListButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      목록보기
    </button>
  );
}
