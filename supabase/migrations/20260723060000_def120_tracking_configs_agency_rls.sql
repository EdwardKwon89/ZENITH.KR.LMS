-- DEF-120: zen_tracking_configs RLS에 AGENCY SELECT 커버리지 추가
-- agency@zenith.kr로 통합 트래킹 조회 시 침묵 실패
-- DEF-114/116/117에 이은 AGENCY is_org_member 결함 4번째 재발
-- Related: Issue #728, TASK-B-192

-- GRANT: CI 환경에서 authenticated 롤에 테이블 접근 권한 부여
GRANT SELECT ON public.zen_tracking_configs TO authenticated;

-- AGENCY SELECT 정책 추가
DROP POLICY IF EXISTS "Agency can view tracking configs for shipper orders" ON public.zen_tracking_configs;

CREATE POLICY "Agency can view tracking configs for shipper orders"
ON public.zen_tracking_configs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
