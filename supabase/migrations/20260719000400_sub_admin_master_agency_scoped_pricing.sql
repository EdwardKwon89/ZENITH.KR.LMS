-- Issue #605 follow-up: SUB_ADMIN 역할 신설 — Master Agency(SNTL)가 본인 관리 하위 대리점(Sub-Agency)의
-- Agency 원가 할인율(zen_agency_pricing_policies)만 등록/관리할 수 있도록 범위 제한된 관리자 도입.
-- 전역 ADMIN과 달리 zen_ups_base_rates(UPS 판매가)·zen_organizations 등 플랫폼 공용/타 조직 데이터는 접근 불가.
-- Team B(JSJung) 사전 의견: "admin이 SNTL이면 지금 구조 그대로 반영 가능" — 단, 전역 ADMIN은 위험하다고 판단해
-- 범위 제한 버전으로 구현. Team B 리뷰 대기 없이 우선 진행(현재 Team B 작업과 겹치는 파일 없음 확인 후 착수).

-- §1 — zen_organizations.parent_id를 Master Agency → Sub-Agency 관계로 사용
--     (parent_id 컬럼은 기존에 존재하나 어떤 기능에도 연결되어 있지 않던 상태 — 재사용)
COMMENT ON COLUMN public.zen_organizations.parent_id IS
  'Master Agency → Sub-Agency 관계(Issue #605). Sub-Agency org의 parent_id = 관리하는 Master Agency org id.';

-- §2 — is_managing_agency: SUB_ADMIN이 특정 agency_org_id를 관리 대상으로 갖는지 확인 (재귀 방지 SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_managing_agency(p_user_id uuid, p_target_agency_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.zen_profiles p
    JOIN public.zen_organizations target ON target.id = p_target_agency_org_id
    WHERE p.id = p_user_id
      AND p.role = 'SUB_ADMIN'
      AND p.status = 'ACTIVE'
      AND target.parent_id = p.org_id
  );
$$;

COMMENT ON FUNCTION public.is_managing_agency IS
  'Issue #605: SUB_ADMIN이 target 조직의 Master Agency(parent_id)로 등록되어 있는지 확인. RLS 정책에서 사용.';

-- §3 — zen_agency_pricing_policies: SUB_ADMIN 전용 RLS (본인이 관리하는 Sub-Agency만 CRUD)
CREATE POLICY "agency_pricing_policies_sub_admin_scoped" ON public.zen_agency_pricing_policies
  FOR ALL TO authenticated
  USING (public.is_managing_agency(auth.uid(), agency_org_id))
  WITH CHECK (public.is_managing_agency(auth.uid(), agency_org_id));
