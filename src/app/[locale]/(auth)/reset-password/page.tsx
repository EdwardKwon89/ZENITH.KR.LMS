'use client';

import { useState } from 'react';
import { sendPasswordReset } from '@/app/actions/auth';
import { ZenAurora, ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const t = useTranslations('Auth');
  const params = useParams();
  const locale = params?.locale as string || 'ko';
  
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;

    try {
      const res = await sendPasswordReset(email, locale);
      if (res.error) {
        setError(res.error);
      } else {
        setIsSuccess(true);
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
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight text-center">
              {t('reset_password_title') || '비밀번호 재설정'}
            </h1>
            <p className="text-stone-500 mt-2 text-sm text-center px-4">
              {t('reset_password_subtitle') || '가입하신 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.'}
            </p>
          </div>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-6">
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
              {isPending ? '발송 중...' : (t('reset_password_button') || '재설정 링크 발송')}
            </ZenButton>
          </form>
        ) : (
          <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-emerald-50 rounded-2xl p-6 mb-8 border border-emerald-100 flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
              <p className="text-emerald-900 font-bold mb-2">
                {t('reset_password_success_title') || '이메일 발송 완료'}
              </p>
              <p className="text-emerald-700 text-sm">
                {t('reset_password_success') || '재설정 링크가 이메일로 발송되었습니다. 메일함을 확인해 주세요.'}
              </p>
            </div>
            
            <Link href={`/${locale}/login`}>
              <ZenButton className="w-full py-4" variant="tactile">
                {t('back_to_login') || '로그인으로 돌아가기'}
              </ZenButton>
            </Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-200/50 text-center">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            © 2026 ZENITH LMS. SECURE ACCESS CONTROL.
          </p>
        </div>
      </ZenCard>
    </ZenAurora>
  );
}
