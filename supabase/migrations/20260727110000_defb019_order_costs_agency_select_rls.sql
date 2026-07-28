-- 20260727110000_defb019_order_costs_agency_select_rls.sql
-- DEF-B-019: zen_order_costs AGENCY SELECT RLS 추가 (TASK-B-225)
--
-- 원인: /admin/ups-actual-charges에서 AGENCY 계정으로 오더 조회 시
--       "예상 청구액(Estimated)"이 항상 0으로 표시됨
-- 원인 테이블: zen_order_costs에 AGENCY용 SELECT RLS 정책 없음
-- 수정: AGENCY 역할이 본인 소속 오더의 비용 정보를 조회할 수 있도록 정책 추가

CREATE POLICY "Agency can view shipper order costs"
ON public.zen_order_costs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_costs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

-- GRANT: authenticated 역할에 기본 권한 확인 (CI/신규 배포 환경 대응)
-- 기존 "Shippers can view their order costs" 정책이 authenticated를 사용하므로
-- GRANT는 이미 존재할 수 있으나, 없을 경우 대비
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_name = 'zen_order_costs'
    AND grantee = 'authenticated'
    AND privilege_type = 'SELECT'
  ) THEN
    GRANT SELECT ON public.zen_order_costs TO authenticated;
  END IF;
END
$$;
