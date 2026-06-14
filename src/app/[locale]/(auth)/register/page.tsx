'use client';

import { Suspense, useState, useEffect } from 'react';
import { ZenAurora, ZenCard, ZenButton, ZenInput } from '@/components/ui/ZenUI';
import { ShieldCheck, User, Building, Search, Upload, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { signup } from '../login/actions';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';

type SignupStep = 'TYPE' | 'INFO' | 'ORG_JOIN' | 'ORG_CREATE' | 'DOCS' | 'COMPLETE';
type OrgType = 'PLATFORM' | 'SHIPPER' | 'CARRIER' | 'AGENCY';

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || 'ko';
  const [step, setStep] = useState<SignupStep>('TYPE');
  const [userType, setUserType] = useState<'PERSONAL' | 'CORPORATE' | null>(null);
  const [orgAction, setOrgAction] = useState<'JOIN' | 'CREATE' | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  
  // Org Create States
  const [orgName, setOrgName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('SHIPPER');

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);

  // IMP-088: 개인정보 활용동의
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);

  const supabase = createClient();

  // 조직 검색 로직
  useEffect(() => {
    if (orgSearch.length > 1) {
      const searchOrgs = async () => {
        const { data } = await supabase
          .from('organizations')
          .select('id, name, corporate_id')
          .ilike('name', `%${orgSearch}%`)
          .limit(5);
        setOrgs(data || []);
      };
      searchOrgs();
    }
  }, [orgSearch, supabase]);

  const handleNext = () => {
    if (step === 'TYPE') {
      if (userType === 'PERSONAL') setStep('INFO');
      else setStep('ORG_JOIN'); // 법인회원은 조인 혹은 생성을 먼저 선택
    } else if (step === 'ORG_JOIN') {
      if (orgAction === 'JOIN') setStep('INFO');
      else setStep('ORG_CREATE');
    } else if (step === 'ORG_CREATE') {
      setStep('INFO');
    } else if (step === 'INFO') {
      if (userType === 'CORPORATE' && orgAction === 'CREATE') setStep('DOCS');
      else handleFinalSubmit();
    } else if (step === 'DOCS') {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (step === 'INFO') {
      if (userType === 'PERSONAL') setStep('TYPE');
      else if (orgAction === 'CREATE') setStep('ORG_CREATE');
      else setStep('ORG_JOIN');
    } else if (step === 'ORG_JOIN') setStep('TYPE');
    else if (step === 'ORG_CREATE') setStep('ORG_JOIN');
    else if (step === 'DOCS') setStep('INFO');
  };

  const handleFinalSubmit = async () => {
    setIsPending(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('full_name', fullName);
      formData.append('phone_number', phoneNumber);
      if (selectedOrgId) formData.append('org_id', selectedOrgId);
      
      // 법인 신규 생성 시의 추가 데이터
      if (orgAction === 'CREATE') {
        formData.append('is_new_org', 'true');
        formData.append('org_name', orgName);
        formData.append('business_number', businessNumber);
        formData.append('org_type', orgType);
      }

      if (docFile) {
        formData.append('doc_file', docFile);
      }

      // IMP-088: 동의 시각 전달
      const now = new Date().toISOString();
      formData.append('privacy_consent_at', now);
      formData.append('terms_consent_at', now);

      const result = await signup(formData, locale);
      
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
        return;
      }

      if (userType === 'PERSONAL') {
        router.push(`/${locale}/orders`);
      } else {
        router.push(`/${locale}/register/pending`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <ZenAurora className="flex items-center justify-center p-4">
      <ZenCard className="w-full max-w-lg bg-white/60 backdrop-blur-3xl shadow-2xl border-white/40">
        
        {/* Step Indicator */}
        <div className="flex justify-between mb-10 px-2">
            {['TYPE', 'INFO', 'DOCS', 'COMPLETE'].map((s, idx) => (
                <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step === s || (s === 'COMPLETE' && step === 'COMPLETE') 
                        ? 'bg-blue-600 text-white shadow-lg scale-110' 
                        : 'bg-stone-200 text-stone-500'
                    }`}>
                        {idx + 1}
                    </div>
                </div>
            ))}
        </div>

        {step === 'TYPE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-800">가입 유형 선택</h2>
              <p className="text-stone-500 text-sm mt-1">Zenith LMS에서 사용할 계정 종류를 선택해주세요.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setUserType('PERSONAL')}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${
                  userType === 'PERSONAL' ? 'border-blue-500 bg-blue-50/50' : 'border-stone-100 bg-white/50 hover:border-blue-200'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                  <User className="text-stone-600" />
                </div>
                <span className="font-bold text-stone-700">개인회원</span>
              </button>
              <button 
                onClick={() => setUserType('CORPORATE')}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 ${
                  userType === 'CORPORATE' ? 'border-blue-500 bg-blue-50/50' : 'border-stone-100 bg-white/50 hover:border-blue-200'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                  <Building className="text-stone-600" />
                </div>
                <span className="font-bold text-stone-700">법인회원</span>
              </button>
            </div>
            <ZenButton disabled={!userType} onClick={handleNext} className="w-full py-4 mt-4">다음 단계로 <ArrowRight className="inline ml-2 w-4 h-4" /></ZenButton>
          </div>
        )}

        {step === 'ORG_JOIN' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-800">조직 연결 방식</h2>
              <p className="text-stone-500 text-sm mt-1">기존 법인에 합류하거나 새로 등록할 수 있습니다.</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-stone-400 w-5 h-5" />
                <ZenInput 
                  placeholder="법인 명칭으로 검색..." 
                  className="pl-12"
                  value={orgSearch}
                  onChange={(e) => {
                      setOrgSearch(e.target.value);
                      setOrgAction('JOIN');
                  }}
                />
                {orgs.length > 0 && (
                    <div className="absolute w-full mt-2 bg-white/80 backdrop-blur-md rounded-2xl border border-stone-200 shadow-xl z-20 overflow-hidden">
                        {orgs.map(org => (
                            <button 
                                key={org.id}
                                onClick={() => {
                                    setSelectedOrgId(org.id);
                                    setOrgSearch(org.name);
                                    setOrgs([]);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex justify-between items-center"
                            >
                                <span className="font-medium text-stone-700">{org.name}</span>
                                <span className="text-[10px] bg-stone-100 px-2 py-1 rounded-lg text-stone-500">{org.corporate_id || 'ID 보류'}</span>
                            </button>
                        ))}
                    </div>
                )}
              </div>
              <div className="relative py-4 flex items-center gap-4">
                  <div className="flex-1 h-px bg-stone-200"></div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-stone-200"></div>
              </div>
              <ZenButton 
                variant="glass" 
                onClick={() => {
                    setOrgAction('CREATE');
                    handleNext();
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <Building className="w-4 h-4" /> 신규 법인 등록(심사 신청)
              </ZenButton>
            </div>
            <div className="flex gap-3">
                <ZenButton variant="ghost" onClick={handleBack} className="flex-1">이전</ZenButton>
                <ZenButton disabled={!selectedOrgId} onClick={handleNext} className="flex-[2]">다음 단계로</ZenButton>
            </div>
          </div>
        )}

        {step === 'ORG_CREATE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-800">신규 법인 정보</h2>
              <p className="text-stone-500 text-sm mt-1">등록하실 법인의 기본 정보를 입력해주세요.</p>
            </div>
            <div className="space-y-4">
              <ZenInput 
                placeholder="법인 명칭 (상호명)" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)} 
              />
              <ZenInput 
                placeholder="사업자등록번호 (숫자만)" 
                value={businessNumber} 
                onChange={(e) => setBusinessNumber(e.target.value)} 
              />
              <div className="grid grid-cols-3 gap-3">
                  {(['SHIPPER', 'CARRIER', 'AGENCY'] as OrgType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setOrgType(type)}
                        className={`px-4 py-3 rounded-2xl border transition-all text-sm font-medium ${
                            orgType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-stone-100 bg-stone-50 text-stone-500'
                        }`}
                      >
                          {type === 'SHIPPER' ? '송하인(화주)' : type === 'CARRIER' ? '운송사' : '대리점'}
                      </button>
                  ))}
              </div>
            </div>
            <div className="flex gap-3">
                <ZenButton variant="ghost" onClick={handleBack} className="flex-1">이전</ZenButton>
                <ZenButton disabled={!orgName || !businessNumber} onClick={handleNext} className="flex-[2]">다음 단계로</ZenButton>
            </div>
          </div>
        )}

        {step === 'INFO' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-800">계정 정보 입력</h2>
              <p className="text-stone-500 text-sm mt-1">{userType === 'PERSONAL' ? '개인' : '법인'} 계정의 기초 정보를 입력해주세요.</p>
            </div>
            <div className="space-y-4">
              <ZenInput placeholder="이름 (성함)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <ZenInput type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} />
              <ZenInput type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
              <ZenInput placeholder="전화번호 (예: 010-1234-5678)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </div>
            {/* IMP-088: 개인정보 활용동의 */}
            <div className="border-t border-stone-200 pt-4 mt-2 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-stone-600 group-hover:text-stone-800 leading-relaxed">
                  [필수] 개인정보 수집·이용에 동의합니다. (수집항목: 이름, 이메일, 전화번호, 사업자등록번호)
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-stone-600 group-hover:text-stone-800 leading-relaxed">
                  [필수] 서비스 이용약관에 동의합니다.
                </span>
              </label>
            </div>
            {error && <div className="text-red-500 text-xs text-center">{error}</div>}
            <div className="flex gap-3">
                <ZenButton variant="ghost" onClick={handleBack} className="flex-1">이전</ZenButton>
                <ZenButton disabled={!email || !password || !privacyConsent || !termsConsent || isPending} onClick={handleNext} className="flex-[2]">
                    {isPending ? '처리 중...' : '다음 단계로'}
                </ZenButton>
            </div>
          </div>
        )}

        {step === 'DOCS' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-stone-800">증빙 서류 제출</h2>
              <p className="text-stone-500 text-sm mt-1">심사를 위해 사업자등록증 사본이 필요합니다.</p>
            </div>
            <div className="border-2 border-dashed border-stone-200 rounded-3xl p-10 flex flex-col items-center gap-4 bg-stone-50/50">
              <Upload className="w-10 h-10 text-stone-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-stone-700">파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-[10px] text-stone-400 mt-1">PDF, JPG, PNG (Max 10MB)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                id="doc-upload"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setDocFile(e.target.files[0]);
                  }
                }}
              />
              <ZenButton variant="glass" onClick={() => document.getElementById('doc-upload')?.click()}>
                {docFile ? docFile.name : '파일 선택'}
              </ZenButton>
            </div>
            {error && <div className="text-red-500 text-xs text-center">{error}</div>}
            <div className="flex gap-3">
                <ZenButton variant="ghost" onClick={handleBack} className="flex-1" disabled={isPending}>이전</ZenButton>
                <ZenButton onClick={handleFinalSubmit} className="flex-[2]" disabled={isPending}>
                  {isPending ? '처리 중...' : '가입 신청 완료'}
                </ZenButton>
            </div>
          </div>
        )}

        {step === 'COMPLETE' && (
          <div className="py-10 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-800">가입 신청 완료!</h2>
              <p className="text-stone-500 text-sm mt-2 px-10 leading-relaxed">
                {userType === 'CORPORATE' && orgAction === 'CREATE' 
                  ? '법인 심사 신청이 접수되었습니다. 서류 검토 후 최대 24시간 이내에 6자리 법인 ID가 발급됩니다.' 
                  : '이메일 인증 후 바로 서비스를 이용하실 수 있습니다.'}
              </p>
            </div>
            <ZenButton onClick={() => router.push(`/${locale}/login`)} className="w-full">로그인 화면으로 이동</ZenButton>
          </div>
        )}

      </ZenCard>
    </ZenAurora>
  );
}
