-- 20260810020000_iss1028_corporate_mgmt_agency_shipper_rls.sql
-- TASK-B-267 (Issue #1028): /mypage/corporate 법인정보 조회·수정을 AGENCY/SHIPPER까지 확장
--
-- 배경: 법인정보 화면(대표자명·사업자번호·연락처·이메일·주소 + 부서 관리)이 CORPORATE·ADMIN
--       역할에만 열려 있어 AGENCY(대리점)·SHIPPER(화주)까지 확장 요청.
--       앱 레벨(NaviSidebar 메뉴 + corporate.ts 서버 액션)과 RLS를 반드시 동일 기준으로 맞춘다
--       (하나라도 어긋나면 "저장 성공 토스트는 뜨지만 DB 미반영" 조용한 실패 — TASK-B-241/DEF-943 전례).
--
-- 변경:
--   ① zen_organizations UPDATE 정책: role 목록에 AGENCY, SHIPPER 추가 (기존 정책 교체)
--   ② zen_departments 관리(FOR ALL) 정책: role 목록에 AGENCY, SHIPPER 추가 (기존 정책 교체)
--
-- 참고: AGENCY_SHIPPER 역할은 이번 요청("agency, shipper")에 명시적으로 미포함 — JSJung 확인 전
--       임의 추가하지 않음. 컬럼 단위 GRANT(rep_name/biz_no/contact_phone/contact_email/address)는
--       기존 마이그레이션(20260807100000)에서 이미 authenticated에 부여 — 변경 불요.

-- 1. zen_organizations UPDATE RLS 정책 교체 (CORPORATE/ADMIN → + AGENCY/SHIPPER)
DROP POLICY IF EXISTS "Allow org members to update their organization" ON public.zen_organizations;

CREATE POLICY "Allow org members to update their organization"
ON public.zen_organizations
FOR UPDATE TO authenticated
USING (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('CORPORATE', 'ADMIN', 'AGENCY', 'SHIPPER')
  )
)
WITH CHECK (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('CORPORATE', 'ADMIN', 'AGENCY', 'SHIPPER')
  )
);

-- 2. zen_departments 관리(FOR ALL) RLS 정책 교체 (CORPORATE/ADMIN → + AGENCY/SHIPPER)
DROP POLICY IF EXISTS "Corporate admins or system admins can manage departments" ON public.zen_departments;

CREATE POLICY "Corporate admins or system admins can manage departments" ON public.zen_departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE zen_profiles.id = auth.uid()
            AND (
                (zen_profiles.org_id = zen_departments.org_id AND zen_profiles.role IN ('CORPORATE', 'AGENCY', 'SHIPPER'))
                OR zen_profiles.role = 'ADMIN'
            )
        )
    );
