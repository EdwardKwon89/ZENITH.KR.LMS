-- [RESTORE] zen_organization_documents 테이블 복구
-- 배경: 20260507013216_remote_schema.sql 에서 테이블 DROP 후 재생성 누락
--       AdminRepository.findOrganizations() 가 zen_organization_documents 조인을 사용하므로
--       테이블이 없으면 PostgREST 스키마 캐시 오류 발생
-- IMP 연관: E2E-01 재검증 시 발견 (TASK-055)

-- 테이블이 없는 경우에만 생성 (안전 처리)
CREATE TABLE IF NOT EXISTS public.zen_organization_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,  -- 'BIZ_REG', 'ID_CARD', 'ETC'
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUPPLEMENT_REQUESTED')),
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- RLS 활성화
ALTER TABLE public.zen_organization_documents ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재설정 (멱등성 보장)
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.zen_organization_documents;
DROP POLICY IF EXISTS "Members can view their own org documents" ON public.zen_organization_documents;

-- 관리자 전체 접근
CREATE POLICY "Admins can manage all documents" ON public.zen_organization_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE zen_profiles.id = auth.uid()
              AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    );

-- 조직 멤버 조회
CREATE POLICY "Members can view their own org documents" ON public.zen_organization_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE zen_profiles.id = auth.uid()
              AND zen_profiles.org_id = zen_organization_documents.org_id
        )
    );

-- service_role 전체 권한 부여 (PostgREST 스키마 캐시 정합성 보장)
GRANT ALL ON public.zen_organization_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_organization_documents TO authenticated;
