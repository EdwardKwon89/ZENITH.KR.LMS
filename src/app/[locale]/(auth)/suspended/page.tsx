'use client';

import { ShieldAlert, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ZenCard } from '@/components/ui/ZenUI';

export default function SuspendedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
      <ZenCard className="max-w-md w-full p-8 space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-black text-red-900 tracking-tight">
          계정이 일시 정지되었습니다
        </h1>
        <p className="text-red-700">
          고객센터 문의: <a href="mailto:support@zenith.kr" className="underline font-semibold">support@zenith.kr</a>
        </p>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </ZenCard>
    </div>
  );
}
