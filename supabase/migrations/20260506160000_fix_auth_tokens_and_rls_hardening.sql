-- [목적] E2E-09 관리자 로그인 실패(Auth Scan Error) 해결 및 RLS 보안 강화
-- [내용] 
-- 1. auth.users 테이블의 NULL 토큰 컬럼을 빈 문자열('')로 보정하여 GoTrue 서비스의 Scan 오류 방지
-- 2. RLS가 비활성화된 핵심 테이블(organizations, profiles, organization_documents) 보안 강화

-- 1. Auth User 토큰 보정
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    email_change = COALESCE(email_change, '')
WHERE 
    confirmation_token IS NULL OR 
    recovery_token IS NULL OR 
    email_change_token_new IS NULL OR 
    email_change_token_current IS NULL OR 
    phone_change_token IS NULL OR 
    reauthentication_token IS NULL OR
    email_change IS NULL;

-- 2. RLS 보안 강화
-- 2.1 zen_organizations 테이블
ALTER TABLE public.zen_organizations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'zen_organizations' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.zen_organizations
        FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 2.2 zen_profiles 테이블
ALTER TABLE public.zen_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'zen_profiles' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.zen_profiles
        FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 2.3 zen_organization_documents 테이블
ALTER TABLE public.zen_organization_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'zen_organization_documents' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.zen_organization_documents
        FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
