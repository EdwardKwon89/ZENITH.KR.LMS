-- WBS 1.3: Identity & Auth Expansion
-- [W] Execution Agent / [A] CTO

-- 1. 조직(Organizations) 테이블 확장
ALTER TABLE public.zen_organizations 
ADD COLUMN IF NOT EXISTS corporate_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS biz_no TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS rep_name TEXT,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
-- 2. 법인 ID 자동 발급을 위한 시퀀스 생성 (010001부터 시작)
CREATE SEQUENCE IF NOT EXISTS corporate_id_seq START WITH 10001;
-- 3. 조직별 다중 증빙 서류 관리 테이블 생성
CREATE TABLE IF NOT EXISTS public.organization_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- 'BIZ_REG', 'ID_CARD', 'ETC'
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUPPLEMENT_REQUESTED')),
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);
-- 4. RLS 보안 정책 추가
ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;
-- 조직 멤버는 본인 조직의 서류 열람 가능
CREATE POLICY "Members can view their own org documents" ON public.organization_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() AND zen_profiles.org_id = organization_documents.org_id
        )
    );
-- 관리자는 모든 서류 열람 및 수정 가능
CREATE POLICY "Admins can manage all documents" ON public.organization_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() AND zen_profiles.role = 'ADMIN'
        )
    );
-- 5. 조직 승인 및 ID 발급 함수 (RPC)
CREATE OR REPLACE FUNCTION public.approve_organization(target_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
BEGIN
    -- 1. 관리자 권한 체크 (간소화된 예시, 실제로는 role 체크 필요)
    -- 2. 이미 승인된 조직인지 체크
    IF EXISTS (SELECT 1 FROM public.zen_organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;

    -- 3. 6자리 시퀀스 ID 생성 (010001 형식)
    new_id := LPAD(nextval('corporate_id_seq')::TEXT, 6, '0');

    -- 4. 조직 상태 업데이트 및 ID 할당
    UPDATE public.zen_organizations
    SET 
        status = 'ACTIVE',
        corporate_id = new_id,
        approval_date = now()
    WHERE id = target_org_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. 신규 유저 가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.zen_profiles (id, email, full_name, role, status)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        COALESCE(new.raw_user_meta_data->>'role', 'MEMBER'),
        'ACTIVE'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
