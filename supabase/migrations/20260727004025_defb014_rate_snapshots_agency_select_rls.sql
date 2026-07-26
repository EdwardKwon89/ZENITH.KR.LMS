-- 20260727004025_defb014_rate_snapshots_agency_select_rls.sql
-- DEF-B-014: zen_order_rate_snapshots AGENCY SELECT RLS 추가 (TASK-B-221)
--
-- 원인: agency@zenith.kr(AGENCY)으로 로그인 시 예상운임이 항상 빈 값(-)으로 표시됨
-- 원인 테이블: zen_order_rate_snapshots에 AGENCY용 SELECT RLS 정책 없음
-- 수정: zen_order_packages의 AGENCY SELECT 정책과 동일 패턴으로 신규 정책 추가

-- 기존 정책은 건드리지 않음 (ADMIN 정책 + order_members 정책은 그대로 유지)
-- PostgreSQL RLS는 정책들이 OR로 결합되므로 충돌하지 않음

CREATE POLICY "Agency can view shipper order rate snapshots"
ON public.zen_order_rate_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_rate_snapshots.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
