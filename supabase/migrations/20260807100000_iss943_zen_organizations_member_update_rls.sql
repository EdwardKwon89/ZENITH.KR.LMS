-- 20260807100000_iss943_zen_organizations_member_update_rls.sql
-- ISS-943 (TASK-B-241): zen_organizations 법인정보 실제 컬럼 저장을 위한 UPDATE RLS + 컬럼 단위 GRANT
--
-- 원인: zen_organizations에는 SELECT RLS 정책만 존재하고 UPDATE 정책이 없어
--       마이페이지 법인정보(rep_name/biz_no/address/contact_phone/contact_email) 수정 시
--       사용자 스코프 UPDATE가 RLS에 의해 조용히 차단됨(0행 영향, 에러 없음)
--       → 저장 성공 토스트만 표시되고 DB에는 미반영
--       (2026-08-07 R-10 실측 로그인 검증: shipper@zenith.kr 저장 → DB 조회로 확인)
-- 수정:
--   ① UPDATE RLS 정책: 소속 조직원(본인 org)이 본인 조직 행만 UPDATE 가능
--   ② 컬럼 단위 GRANT: authenticated의 UPDATE 허용 컬럼을 법인정보 5개로 제한
--      (Jaison PR#996 리뷰 반영 — RLS는 행 단위만 제어하므로 컬럼 제한은 GRANT로 수행.
--       이 테이블에 volumetric_divisor(정산 직결)·type(조직 유형)·status(승인 상태) 등
--       민감 컬럼이 함께 있어, 행 단위 정책만으로는 우회가 가능함)
--   ③ defense-in-depth: 정책에 CORPORATE/ADMIN role 조건 추가
--      (updateOrganizationInfo() 역할 검증과 동일 기준)
--
-- 참고(관련 발견): src/app/actions/ups/rates-mutation.ts updateAgencyVolumetricDivisor 도
--       사용자 스코프 클라이언트로 타 조직 행을 UPDATE 하므로 동일하게 0행 처리됨(기존 잠재 결함,
--       본 정책으로는 해소 불가 — 별도 보고 필요)

-- 1. UPDATE RLS 정책: 소속 조직원(CORPORATE/ADMIN)이 본인 조직 행의 법인정보 컬럼만 갱신
DROP POLICY IF EXISTS "Allow org members to update their organization" ON public.zen_organizations;

CREATE POLICY "Allow org members to update their organization"
ON public.zen_organizations
FOR UPDATE TO authenticated
USING (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('CORPORATE', 'ADMIN')
  )
)
WITH CHECK (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid() AND role IN ('CORPORATE', 'ADMIN')
  )
);

-- 2. 컬럼 단위 GRANT: authenticated의 UPDATE를 법인정보 5개 컬럼으로 제한
--    (20260728110000_imp153_authenticated_grant_일괄.sql 이 authenticated에 전체 컬럼 UPDATE
--     GRANT를 부여했으므로, 테이블 레벨 + 잔존 컬럼 레벨 GRANT를 모두 철회 후
--     이번 화면이 다루는 컬럼만 재부여)
REVOKE UPDATE ON public.zen_organizations FROM authenticated;

-- 잔존 컬럼 레벨 UPDATE GRANT(imp153 등에서 부여된 전체 26개 컬럼) 일괄 철회
DO $$
DECLARE col_name text;
BEGIN
  FOR col_name IN
    SELECT c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'zen_organizations'
  LOOP
    EXECUTE format('REVOKE UPDATE (%I) ON public.zen_organizations FROM authenticated', col_name);
  END LOOP;
END $$;

GRANT UPDATE (rep_name, biz_no, contact_phone, contact_email, address)
  ON public.zen_organizations TO authenticated;
