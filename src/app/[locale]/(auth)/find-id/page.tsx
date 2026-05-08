'use client';

import { useState } from 'react';
import { findUserId } from '@/app/actions/auth';
import { ZenAurora, ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { User, Mail, ArrowLeft, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FindIdPage() {
  const t = useTranslations('Auth');
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || 'ko';
  
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;

    try {
      const res = await findUserId(fullName, email);
      if (res.error) {
        setError(res.error);
      } else if (res.maskedEmail) {
        setResult(res.maskedEmail);
      }
    } catch (err) {
      setError('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ZenAurora className="flex items-center justify-center p-4">
      <ZenCard className="w-full max-w-md bg-white/40 backdrop-blur-2xl border-white/30 shadow-2xl">
        <div className="mb-8">
          <Link 
            href={`/${locale}/login`}
            className="inline-flex items-center gap-2 text-stone-500 hover:text-brand-600 transition-colors text-sm mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('back_to_login') || '로그인으로 돌아가기'}
          </Link>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
              {t('find_id_title') || '계정 찾기'}
            </h1>
            <p className="text-stone-500 mt-2 text-sm text-center">
              {t('find_id_subtitle') || '가입 시 등록한 이름과 이메일을 입력하세요.'}
            </p>
          </div>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                {t('full_name_label') || '이름'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <ZenInput 
                  name="fullName" 
                  placeholder={t('full_name_placeholder') || '성함을 입력하세요'} 
                  className="pl-10"
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                {t('email_label') || '이메일'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                <ZenInput 
                  name="email" 
                  type="email"
                  placeholder="example@company.com" 
                  className="pl-10"
                  required 
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">
                {error}
              </div>
            )}

            <ZenButton 
              type="submit" 
              disabled={isPending}
              className="w-full py-4 flex items-center justify-center gap-2"
            >
              {isPending ? '조회 중...' : (t('find_id_button') || 'ID 확인하기')}
            </ZenButton>
          </form>
        ) : (
          <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-brand-50 rounded-2xl p-6 mb-8 border border-brand-100">
              <p className="text-stone-500 text-sm mb-2">{t('find_id_success') || '계정을 찾았습니다'}</p>
              <p className="text-2xl font-bold text-brand-700 tracking-tight font-mono">
                {result}
              </p>
            </div>
            
            <ZenButton 
              onClick={() => router.push(`/${locale}/login`)}
              className="w-full py-4"
            >
              {t('login_button') || '로그인하러 가기'}
            </ZenButton>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-200/50 text-center">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            © 2026 ZENITH LMS. ALL RIGHTS RESERVED.
          </p>
        </div>
      </ZenCard>
    </ZenAurora>
  );
}
