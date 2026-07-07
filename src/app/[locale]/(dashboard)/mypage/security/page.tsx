'use client';

import { useState } from 'react';
import { changePasswordWithReauth } from '@/app/actions/auth';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { ShieldCheck, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function SecurityPage() {
  const t = useTranslations('Auth');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params?.locale as string || 'ko';
  const isRecoveryMode = searchParams.get('mode') === 'recovery';
  
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword) {
      setError(t('current_password_required') || '현재 비밀번호를 입력해주세요.');
      setIsPending(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('password_mismatch') || '비밀번호가 일치하지 않습니다.');
      setIsPending(false);
      return;
    }

    if (password.length < 8) {
      setError(t('password_min_length') || '비밀번호는 최소 8자 이상이어야 합니다.');
      setIsPending(false);
      return;
    }

    try {
      const res = await changePasswordWithReauth(currentPassword, password);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setIsSuccess(true);
        toast.success(t('change_password_success') || '비밀번호가 성공적으로 변경되었습니다.');
      }
    } catch (err) {
      setError(t('change_password_error') || '비밀번호 변경 중 오류가 발생했습니다.');
      toast.error(t('error_occurred') || '오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold font-heading text-slate-950 tracking-tight">
          {t('my_security_title') || '보안 설정'}
        </h1>
        <p className="text-slate-500">
          {t('my_security_desc') || '계정 보안을 위해 비밀번호를 주기적으로 변경해 주세요.'}
        </p>
      </div>

      {isRecoveryMode && !isSuccess && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-bold text-sm">비밀번호 재설정 모드</p>
            <p className="text-xs mt-1">인증 링크를 통해 접속하셨습니다. 새로 사용할 안전한 비밀번호를 입력해 주세요.</p>
          </div>
        </div>
      )}

      <ZenCard className="p-8 bg-white border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <ShieldCheck size={120} />
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  {t('current_password_label') || '현재 비밀번호'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <ZenInput
                    name="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  {t('new_password_label') || '새 비밀번호'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <ZenInput 
                    name="password" 
                    type="password"
                    placeholder="••••••••" 
                    className="pl-10"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  {t('confirm_password_label') || '비밀번호 확인'}
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <ZenInput 
                    name="confirmPassword" 
                    type="password"
                    placeholder="••••••••" 
                    className="pl-10"
                    required 
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="pt-4">
              <ZenButton 
                type="submit" 
                disabled={isPending}
                className="w-full py-4 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                {isPending ? '변경 중...' : (t('change_password_button') || '비밀번호 변경 완료')}
              </ZenButton>
            </div>
          </form>
        ) : (
          <div className="text-center py-10 space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">비밀번호 변경 완료</h2>
              <p className="text-slate-500 text-sm">성공적으로 비밀번호가 변경되었습니다. 이제 새로운 비밀번호로 서비스를 이용하실 수 있습니다.</p>
            </div>
            <ZenButton 
              onClick={() => window.location.href = `/${locale}/dashboard`}
              className="px-8"
              variant="tactile"
            >
              대시보드로 돌아가기
            </ZenButton>
          </div>
        )}
      </ZenCard>

      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-brand-600" />
          안전한 비밀번호 가이드라인
        </h4>
        <ul className="text-xs text-slate-500 space-y-2 list-disc pl-5">
          <li>비밀번호는 8자 이상으로 설정해 주세요.</li>
          <li>영문, 숫자, 특수문자를 혼합하여 사용하시면 더욱 안전합니다.</li>
          <li>다른 사이트에서 사용하는 비밀번호와 다르게 설정하는 것을 권장합니다.</li>
          <li>생년월일, 전화번호 등 유추하기 쉬운 정보는 포함하지 마세요.</li>
        </ul>
      </div>
    </div>
  );
}
