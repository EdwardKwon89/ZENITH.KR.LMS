-- 20260606050000_gap_p6_01_order_services_rls_patch.sql
-- [GAP-P6-01] zen_order_services 테이블의 INSERT RLS 정책 보완
-- 화주(CORPORATE/INDIVIDUAL)가 본인의 order_id에 한해 서비스 배정을 추가할 수 있도록 허용

BEGIN;

DROP POLICY IF EXISTS "order_services_insert" ON public.zen_order_services;

CREATE POLICY "order_services_insert"
  ON public.zen_order_services FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE id = order_id
      AND public.is_org_member(auth.uid(), shipper_id)
    )
  );

COMMIT;
