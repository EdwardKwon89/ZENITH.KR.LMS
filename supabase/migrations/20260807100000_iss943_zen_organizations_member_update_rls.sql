-- 20260807100000_iss943_zen_organizations_member_update_rls.sql
-- ISS-943 (TASK-B-241): zen_organizations 법인정보 실제 컬럼 저장을 위한 UPDATE RLS 추가
--
-- 원인: zen_organizations에는 SELECT RLS 정책만 존재하고 UPDATE 정책이 없어
--       마이페이지 법인정보(rep_name/biz_no/address/contact_phone/contact_email) 수정 시
--       사용자 스코프 UPDATE가 RLS에 의해 조용히 차단됨(0행 영향, 에러 없음)
--       → 저장 성공 토스트만 표시되고 DB에는 미반영
--       (2026-08-07 R-10 실측 로그인 검증: shipper@zenith.kr 저장 → DB 조회로 확인)
-- 수정: 소속 조직원(zen_profiles.org_id = 본인)이 본인 조직 행만 UPDATE 가능하도록 정책 추가
--       id 변경 방지를 위해 WITH CHECK에서 동일 id 강제
--
-- 참고(관련 발견): src/app/actions/ups/rates-mutation.ts updateAgencyVolumetricDivisor 도
--       사용자 스코프 클라이언트로 타 조직 행을 UPDATE 하므로 동일하게 0행 처리됨(기존 잠재 결함,
--       본 정책으로는 해소 불가 — 별도 보고 필요)

-- 1. UPDATE: 소속 조직원이 본인 조직 행 갱신
DROP POLICY IF EXISTS "Allow org members to update their organization" ON public.zen_organizations;

CREATE POLICY "Allow org members to update their organization"
ON public.zen_organizations
FOR UPDATE TO authenticated
USING (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
)
WITH CHECK (
  id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

-- 2. GRANT: authenticated 역할 UPDATE 권한은 이미 존재하므로 별도 GRANT 생략
--    (20260728110000_imp153_authenticated_grant_일괄.sql 에서 UPDATE 포함 부여)
