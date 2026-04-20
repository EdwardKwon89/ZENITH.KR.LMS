
-- 1. RLS 정책 한시적 비활성화 (UAT 조회를 위해)
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. 관리자(governance_master) 상태 확정 (Auth & Profile)
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('status', 'ACTIVE', 'org_type', 'PLATFORM')
WHERE email = 'governance_master@zenith.kr';

UPDATE public.profiles 
SET status = 'ACTIVE', role = 'ADMIN'
WHERE email = 'governance_master@zenith.kr';

-- 3. 테스트 유저(test_corp_001) 상태 확정 (Auth & Profile)
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('status', 'PENDING', 'org_type', 'SHIPPER')
WHERE email = 'test_corp_001@zenith.kr';

UPDATE public.profiles 
SET status = 'PENDING', role = 'MEMBER'
WHERE email = 'test_corp_001@zenith.kr';

-- 4. 조직(UAT Test Corp) 상태 확정 (org_name_ko 기준)
UPDATE public.organizations 
SET status = 'PENDING', org_type = 'SHIPPER'
WHERE org_name_ko = 'UAT Test Corp';
