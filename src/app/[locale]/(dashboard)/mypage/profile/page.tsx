'use client';

import { useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile } from '@/app/actions/member';
import { ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { User, Mail, Building, ShieldCheck, Save, Loader2, UserMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { USER_ROLES } from '@/lib/auth/rbac';
import WithdrawalModal from '@/components/mypage/WithdrawalModal';
import { withdrawUser } from '@/app/actions/member';

export default function ProfilePage() {
  const t = useTranslations('Auth');
  const navT = useTranslations('Navigation');
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || 'ko';
  
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getMyProfile();
        setProfile(data);
      } catch (err) {
        toast.error('프로필 정보를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const fullName = formData.get('fullName') as string;

    try {
      const res = await updateMyProfile({ fullName });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('프로필 정보가 성공적으로 업데이트되었습니다.');
        setProfile((prev: any) => ({ ...prev, full_name: fullName }));
      }
    } catch (err) {
      toast.error('프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsPending(false);
    }
  }

  async function handleWithdraw() {
    try {
      const res = await withdrawUser();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('탈퇴 처리가 완료되었습니다. 이용해 주셔서 감사합니다.');
        router.push(`/${locale}/login`);
      }
    } catch (err) {
      toast.error('탈퇴 처리 중 오류가 발생했습니다.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold font-heading text-slate-950 tracking-tight">
          {t('my_profile_title') || '프로필 관리'}
        </h1>
        <p className="text-slate-500">
          {t('my_profile_desc') || '회원님의 기본 정보를 확인하고 수정할 수 있습니다.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <ZenCard className="lg:col-span-2 p-8 bg-white border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-24 h-24 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm">
                <User size={48} />
              </div>
              <div className="flex-1 w-full space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    {t('full_name_label') || '성명'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <ZenInput 
                      name="fullName" 
                      defaultValue={profile?.full_name || ''}
                      placeholder={t('full_name_placeholder') || '성함을 입력하세요'} 
                      className="pl-10"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    {t('email_label') || '이메일'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                    <ZenInput 
                      defaultValue={profile?.email || ''}
                      className="pl-10 bg-slate-50 text-slate-500 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1">이메일은 변경할 수 없습니다. 변경이 필요한 경우 고객센터로 문의해 주세요.</p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="flex justify-end">
              <ZenButton 
                type="submit" 
                disabled={isPending}
                className="flex items-center gap-2 px-6"
              >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isPending ? '저장 중...' : '변경 내용 저장'}
              </ZenButton>
            </div>
          </form>
        </ZenCard>

        {/* Info Card */}
        <div className="space-y-6">
          <ZenCard className="p-6 bg-slate-50 border-transparent">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-brand-600 w-4 h-4" />
              계정 정보
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">권한 등급</p>
                <p className="text-sm font-semibold text-slate-700">{profile?.role || USER_ROLES.USER}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">소속 조직</p>
                <p className="text-sm font-semibold text-slate-700">{profile?.organization || 'ZENITH_LMS'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">가입 일자</p>
                <p className="text-sm font-semibold text-slate-700">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </ZenCard>

          <ZenCard className="p-6 bg-brand-600 border-transparent text-white">
            <h3 className="text-sm font-bold mb-2">보안 팁</h3>
            <p className="text-xs text-brand-100 leading-relaxed">
              안전한 서비스 이용을 위해 비밀번호를 주기적으로 변경해 주세요. 타인에게 계정 정보를 노출하지 마십시오.
            </p>
            <ZenButton 
              variant="glass" 
              className="w-full mt-4 text-xs py-2 h-auto"
              onClick={() => window.location.href = `/${locale}/mypage/security`}
            >
              보안 설정 바로가기
            </ZenButton>
          </ZenCard>
        </div>
      </div>

      {/* Withdrawal Section */}
      <ZenCard className="p-8 bg-rose-50 border-rose-100 border-dashed">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              <UserMinus className="w-5 h-5" />
              회원 탈퇴
            </h3>
            <p className="text-sm text-rose-700 max-w-xl">
              계정을 삭제하면 더 이상 서비스를 이용하실 수 없으며, 모든 개인정보가 안전하게 보호된 상태로 비활성화됩니다.
            </p>
          </div>
          <ZenButton 
            variant="tactile" 
            className="border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 shrink-0"
            onClick={() => setShowWithdrawalModal(true)}
          >
            탈퇴하기
          </ZenButton>
        </div>
      </ZenCard>

      <WithdrawalModal 
        isOpen={showWithdrawalModal} 
        onClose={() => setShowWithdrawalModal(false)}
        locale={locale}
      />
    </div>
  );
}
