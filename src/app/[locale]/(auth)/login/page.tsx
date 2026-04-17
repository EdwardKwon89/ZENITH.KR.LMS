'use client';

import { Suspense, useState } from 'react';
import { login, signup } from './actions';
import { ZenAurora, ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Truck, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

function LoginForm() {
  const t = useTranslations('Auth');
  const { error, setError } = useAuth();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const action = (event.nativeEvent as any).submitter?.getAttribute('data-action');

    try {
      if (action === 'signup') {
        await signup(formData);
      } else {
        await login(formData);
      }
    } catch (err: any) {
      setError(err.message || '인증 과정에서 오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <ZenAurora className="flex items-center justify-center p-4">
      <ZenCard className="w-full max-w-md bg-white/40 backdrop-blur-2xl border-white/30 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-subtle-float">
            <Truck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">ZENITH LMS</h1>
          <p className="text-stone-500 mt-2 text-sm text-center">
            SNTL 통합 물류 정보망 - 지능형 트래킹 시스템
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">{t('login_email_label') || 'Email'}</label>
            <ZenInput 
              id="email" 
              name="email" 
              type="email" 
              placeholder="example@zenith.kr" 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">{t('login_password_label') || 'Password'}</label>
            <ZenInput 
              id="password" 
              name="password" 
              type="password" 
              required 
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <ZenButton 
              type="submit" 
              data-action="login"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 group"
            >
              {isPending ? 'Connecting...' : (t('login_button') || 'Sign In')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </ZenButton>
            
            <ZenButton 
              type="submit" 
              data-action="signup"
              variant="ghost" 
              disabled={isPending}
              className="w-full text-xs"
            >
              {t('signup_button') || 'Create Corporate Account'}
            </ZenButton>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-200/50 text-center">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            © 2026 SNTL GLOBAL. ADVANCED AGENTIC LOGISTICS.
          </p>
        </div>
      </ZenCard>
    </ZenAurora>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
