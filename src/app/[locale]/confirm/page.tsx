'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params?.locale as string || 'ko';
  const supabase = createClient();

  useEffect(() => {
    const handleConfirm = async () => {
      const type = searchParams.get('type');
      
      // Supabase auth state change listener will handle the hash/token automatically
      // We just need to wait a bit and redirect based on the type
      
      if (type === 'recovery') {
        // For recovery, we want them to go to the security page to set a new password
        // They are automatically logged in by the recovery link
        router.push(`/${locale}/mypage/security?mode=recovery`);
      } else if (type === 'signup') {
        // For signup confirmation
        router.push(`/${locale}/dashboard`);
      } else {
        // Default redirect
        router.push(`/${locale}/dashboard`);
      }
    };

    handleConfirm();
  }, [router, searchParams, locale, supabase]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      <p className="text-slate-500 font-medium animate-pulse">인증 확인 중...</p>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
