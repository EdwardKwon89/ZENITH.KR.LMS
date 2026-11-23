-- TASK-B-376 (Issue #1442): zen_order_costs UPS_ACTUAL_ADJUSTMENT 화주·대리점 노출 차단
-- JSJung 확정: UPS 실비는 원가이며 화주·대리점은 확인 불가(SUPER_ADMIN·ADMIN·MANAGER 전용).
-- 기존 SELECT 정책 조건을 유지하고 화주·대리점 분기에만 cost_type <> 'UPS_ACTUAL_ADJUSTMENT'를 추가한다.
-- 관리자 정책(Admins can manage order costs)은 변경하지 않는다.
-- 롤백: 20260522002000_fix_rls_cascade_drop_profiles.sql / 20260727110000_defb019_order_costs_agency_select_rls.sql 정책 재생성.

BEGIN;

-- 1) 화주 SELECT 정책: 화주(본인 org) 분기에만 실비 행 제외, ADMIN/SUPER_ADMIN 분기는 유지
DROP POLICY IF EXISTS "Shippers can view their order costs" ON public.zen_order_costs;
CREATE POLICY "Shippers can view their order costs" ON public.zen_order_costs
FOR SELECT TO public
USING (
  (
    EXISTS (
      SELECT 1 FROM public.zen_orders
      JOIN public.zen_profiles ON zen_profiles.org_id = zen_orders.shipper_id
      WHERE zen_orders.id = zen_order_costs.order_id
        AND zen_profiles.id = auth.uid()
    )
    AND zen_order_costs.cost_type <> 'UPS_ACTUAL_ADJUSTMENT'
  )
  OR EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role::text = ANY (ARRAY['ADMIN', 'ZENITH_SUPER_ADMIN'])
  )
);

-- 2) 대리점 SELECT 정책: 대리점 분기에만 실비 행 제외
DROP POLICY IF EXISTS "Agency can view shipper order costs" ON public.zen_order_costs;
CREATE POLICY "Agency can view shipper order costs" ON public.zen_order_costs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_costs.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
  AND zen_order_costs.cost_type <> 'UPS_ACTUAL_ADJUSTMENT'
);

COMMIT;

NOTIFY pgrst, 'reload schema';
