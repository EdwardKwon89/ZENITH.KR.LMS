'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, 
  FileSearch, 
  AlertCircle, 
  LogOut, 
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

/**
 * 🏢 가입 심사 대기 페이지 (Pending Approval Page)
 * 사용자의 상태(PENDING, SUPPLEMENT_REQUIRED, REJECTED)에 따라 
 * 각각 다른 메시지와 액션을 제공하는 프리미엄 디자인 페이지.
 */
export default function PendingPage() {
  const t = useTranslations('Pending');
  const params = useParams();
  const locale = params?.locale as string || 'ko';
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'PENDING' | 'SUPPLEMENT_REQUIRED' | 'REJECTED'>('PENDING');
  const [comment, setComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 🔍 1. Auth Metadata 확인 (빠른 피드백)
      let currentStatus = (user.app_metadata?.status as any) || 'PENDING';
      
      // 🔍 2. DB(profiles)에서 최신 상태 확인 (메타데이터 지연 방지)
      const { data: profile } = await supabase
        .from('zen_profiles')
        .select('status, zen_organizations(approval_comment)')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        currentStatus = profile.status;
        if (profile.zen_organizations) {
           setComment((profile.zen_organizations as any).approval_comment);
        }
      }

      setStatus(currentStatus);

      // 승인 완료 시 실제 존재하는 대시보드 경로(/orders)로 즉시 리다이렉트
      if (currentStatus === 'ACTIVE') {
        router.push(`/${locale}/orders`);
        return;
      }
      setLoading(false);
    }
    fetchStatus();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-8 md:p-12 text-center">
          
          {/* Icon Section */}
          <div className="flex justify-center mb-8">
            <div className={`p-5 rounded-2xl shadow-sm ${
              status === 'SUPPLEMENT_REQUIRED' ? 'bg-amber-50 text-amber-500' :
              status === 'REJECTED' ? 'bg-rose-50 text-rose-500' :
              'bg-indigo-50 text-indigo-500'
            }`}>
              {status === 'SUPPLEMENT_REQUIRED' && <FileSearch className="w-12 h-12" />}
              {status === 'REJECTED' && <AlertCircle className="w-12 h-12" />}
              {status === 'PENDING' && <ClipboardCheck className="w-12 h-12 animate-pulse" />}
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            {status === 'SUPPLEMENT_REQUIRED' ? t('title_supplement') :
             status === 'REJECTED' ? t('title_rejected') :
             t('title_pending')}
          </h1>
          <p className="text-slate-600 mb-8 leading-relaxed max-w-md mx-auto">
            {status === 'SUPPLEMENT_REQUIRED' ? t('desc_supplement') :
             status === 'REJECTED' ? t('desc_rejected') :
             t('desc_pending')}
          </p>

          {/* Comment Box (for Rejection/Supplement) */}
          {comment && (
            <div className={`mb-10 p-6 rounded-2xl text-left border ${
              status === 'SUPPLEMENT_REQUIRED' ? 'bg-amber-50/50 border-amber-100' : 'bg-rose-50/50 border-rose-100'
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Manager's Comment
              </span>
              <p className="text-slate-700 font-medium">
                {comment}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid gap-3 sm:flex sm:justify-center sm:items-center">
            {status !== 'PENDING' && (
              <button
                onClick={() => router.push('/register')}
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
              >
                {status === 'SUPPLEMENT_REQUIRED' ? t('button_modify') : t('button_reapply')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              {t('button_logout')}
            </button>
          </div>

          {/* Footer Support */}
          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-sm text-slate-400">
              도움이 필요하신가요? <a href="mailto:support@zenith.kr" className="text-indigo-600 hover:underline font-medium">고객지원팀에 문의</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
