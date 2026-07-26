-- DEF-B-010: zen_tracking_configs AGENCY UPDATE RLS 정책 추가
-- registerUpsOrder()의 tracking_no 동기화가 AGENCY 세션에서 침묵 실패
-- DEF-114/116/117/120/126/B-002에 이은 AGENCY RLS 커버리지 누락 6번째 재발
-- Related: Issue #869, TASK-B-216

-- AGENCY UPDATE 정책 추가 (기존 SELECT 정책과 동일한 agency_org_id 매칭 조건)
DROP POLICY IF EXISTS "Agency can update tracking configs for shipper orders" ON public.zen_tracking_configs;

CREATE POLICY "Agency can update tracking configs for shipper orders"
ON public.zen_tracking_configs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
