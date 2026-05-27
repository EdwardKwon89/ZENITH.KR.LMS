'use client';

import { useState } from 'react';
import { findPersonalId, findCorporateId } from '@/app/actions/auth';
import { ZenAurora, ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { User, Building, ArrowLeft, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type TabType = 'personal' | 'corporate';

export default function FindIdPage() {
  const t = useTranslations('Auth');
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || 'ko';

  const [tab, setTab] = useState<TabType>('personal');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; phone?: string }[] | null>(null);

  async function handlePersonalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const fullName = formData.get('fullName') as string;

    try {
      const res = await findPersonalId(fullName);
      if (res.error) {
        setError(res.error);
      } else if (res.results && res.results.length > 0) {
        setResult(res.results);
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsPending(false);
    }
  }

  async function handleCorporateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const orgName = formData.get('orgName') as string;
    const regNo = formData.get('regNo') as string;

    try {
      const res = await findCorporateId(orgName, regNo);
      if (res.error) {
        setError(res.error);
      } else if (res.maskedEmail) {
        setResult([{ email: res.maskedEmail }]);
      }
    } catch {
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
              {t('find_id_title') || '아이디 찾기'}
            </h1>
            <p className="text-stone-500 mt-2 text-sm text-center">
              {tab === 'personal'
                ? '이름을 입력하면 가입된 아이디(이메일)를 찾을 수 있습니다.'
                : '법인명과 사업자번호로 담당자 아이디를 찾을 수 있습니다.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setTab('personal'); setError(null); setResult(null); }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              tab === 'personal'
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            <User className="w-4 h-4" /> 개인
          </button>
          <button
            type="button"
            onClick={() => { setTab('corporate'); setError(null); setResult(null); }}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              tab === 'corporate'
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            <Building className="w-4 h-4" /> 법인
          </button>
        </div>

        {!result ? (
          tab === 'personal' ? (
            <form onSubmit={handlePersonalSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                  {t('full_name_label') || '이름'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <ZenInput
                    name="fullName"
                    placeholder={t('full_name_placeholder') || '이름을 입력하세요'}
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
                {isPending ? '조회 중...' : (t('find_id_button') || '아이디 찾기')}
              </ZenButton>
            </form>
          ) : (
            <form onSubmit={handleCorporateSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                  법인명
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <ZenInput
                    name="orgName"
                    placeholder="법인명을 입력하세요"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">
                  사업자등록번호
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                  <ZenInput
                    name="regNo"
                    placeholder="123-45-67890"
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
                {isPending ? '조회 중...' : '담당자 아이디 찾기'}
              </ZenButton>
            </form>
          )
        ) : (
          <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-brand-50 rounded-2xl p-6 mb-8 border border-brand-100">
              <p className="text-stone-500 text-sm mb-2">
                {tab === 'personal' ? '가입된 아이디(이메일)를 찾았습니다' : '법인 담당자 아이디를 찾았습니다'}
              </p>
              {tab === 'personal' && result ? (
                <div className="space-y-3">
                  {result.map((r, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-brand-100">
                      <p className="text-lg font-bold text-brand-700 tracking-tight font-mono">
                        {r.email}
                      </p>
                      {r.phone && (
                        <p className="text-stone-500 text-xs mt-1">
                          전화번호: {r.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : result && result.length > 0 ? (
                <p className="text-2xl font-bold text-brand-700 tracking-tight font-mono">
                  {result[0].email}
                </p>
              ) : null}
              {result && result.length > 1 && (
                <p className="text-[10px] text-stone-400 mt-3">
                  총 {result.length}건의 계정이 검색되었습니다.
                </p>
              )}
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
