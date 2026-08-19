-- DEF-130 (Issue #895, TASK-1135): zen_ups_base_rates SUB_ADMIN SELECT 정책 추가
--
-- 배경: TASK-192(Issue #618)가 UpsBaseRateMatrix 컴포넌트를 SUB_ADMIN 모드로 재사용해
-- /admin/ups-rates "기준요금" 탭을 SUB_ADMIN에게 열어줬으나, 20260719000400_sub_admin_
-- master_agency_scoped_pricing.sql이 "SUB_ADMIN은 zen_ups_base_rates(판매가) 접근 불가"로
-- 의도적으로 제한해둔 상태라 화면이 항상 빈 목록으로 고장나 있었음(SELECT RLS 정책 3개
-- 어디에도 SUB_ADMIN 미포함). Aiden 설계 결정(A안): 화면이 이미 열려있는 실제 업무 필요성
-- (원가 관리 시 판매가 참고)을 인정하고 RLS에 SUB_ADMIN 조회 정책을 추가한다. 수정 권한은
-- 그대로 닫아두고(cost_price 관리 경로인 zen_agency_pricing_policies만 SUB_ADMIN이 CRUD),
-- base_rates는 SELECT만 허용한다.
--
-- 스코프 설계 노트: zen_agency_pricing_policies는 agency_org_id 컬럼이 있어
-- is_managing_agency(uid, target_org_id)로 "그 특정 하위 대리점" 단위까지 스코프를 걸 수
-- 있었다. 반면 zen_ups_base_rates는 상품×구간×중량 단위의 플랫폼 공용 판매가 카탈로그로
-- 특정 조직에 귀속되는 컬럼 자체가 없다(AGENCY 역할도 동일하게 전역 활성 요율을 본다,
-- ups_base_rates_agency_select 참조) — 따라서 "행 단위로 어느 대리점 소속인지"로 스코프를
-- 거는 것은 테이블 구조상 불가능하다. 대신 "이 SUB_ADMIN이 실제로 하위 대리점을 관리하는
-- 상태인가"(고아 SUB_ADMIN 방지) 수준에서 is_managing_agency와 동일한 관계(zen_organizations.
-- parent_id)를 재사용해 스코프를 건다. 결과적으로 서로 다른 Master Agency 소속 SUB_ADMIN들도
-- (AGENCY 역할과 마찬가지로) 동일한 공용 판매가 카탈로그를 보게 되며, 이는 테이블 설계상
-- 의도된 동작이다(회귀 테스트에서 명시적으로 확인·기록).

-- §1 — has_managed_sub_agency: SUB_ADMIN이 현재 하나 이상의 Sub-Agency를 관리 중인지 확인
--     (재귀 방지 SECURITY DEFINER, is_managing_agency와 동일 패턴)
CREATE OR REPLACE FUNCTION public.has_managed_sub_agency(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.zen_profiles p
    JOIN public.zen_organizations sub ON sub.parent_id = p.org_id
    WHERE p.id = p_user_id
      AND p.role = 'SUB_ADMIN'
      AND p.status = 'ACTIVE'
  );
$$;

COMMENT ON FUNCTION public.has_managed_sub_agency IS
  'DEF-130(Issue #895): SUB_ADMIN이 하나 이상의 Sub-Agency(zen_organizations.parent_id)를 관리 중인 ACTIVE 상태인지 확인. zen_ups_base_rates SELECT RLS에서 사용.';

-- §2 — zen_ups_base_rates: SUB_ADMIN 활성 요율 SELECT 전용 정책 (수정 권한은 부여하지 않음)
CREATE POLICY "ups_base_rates_sub_admin_select"
  ON public.zen_ups_base_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND public.has_managed_sub_agency(auth.uid())
  );
