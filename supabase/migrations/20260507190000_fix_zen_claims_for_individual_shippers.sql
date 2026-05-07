-- [PH14-E2E-10] zen_claims 테이블 개별 화주 대응 및 RLS 고도화
-- 1. org_id NULL 허용 (개인 회원은 조직이 없음)
ALTER TABLE public.zen_claims ALTER COLUMN org_id DROP NOT NULL;

-- 2. RLS 정책 삭제 후 재등록 (개인 회원 및 created_by 기반 소유권 추가)
DROP POLICY IF EXISTS "Shippers can insert their own claims" ON public.zen_claims;
DROP POLICY IF EXISTS "Shippers can view their own claims" ON public.zen_claims;

-- [INSERT] 개인 회원이거나 본인 조직의 클레임만 삽입 가능
CREATE POLICY "Shippers can insert their own claims" ON public.zen_claims
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE zen_profiles.id = auth.uid()
        AND (
            zen_profiles.org_id = zen_claims.org_id -- 법인 화주
            OR 
            (zen_profiles.role = 'INDIVIDUAL' AND zen_claims.org_id IS NULL) -- 개인 화주
        )
    )
);

-- [SELECT] 본인이 생성했거나 본인 조직의 클레임만 조회 가능 (어드민 제외)
CREATE POLICY "Shippers can view their own claims" ON public.zen_claims
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE zen_profiles.id = auth.uid()
        AND (
            zen_profiles.role = 'ADMIN' 
            OR zen_profiles.role = 'ZENITH_SUPER_ADMIN'
            OR zen_profiles.org_id = zen_claims.org_id
            OR (zen_profiles.role = 'INDIVIDUAL' AND zen_claims.created_by = auth.uid())
        )
    )
);
