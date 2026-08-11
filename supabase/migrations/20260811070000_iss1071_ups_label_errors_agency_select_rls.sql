-- TASK-B-285 (Issue #1071): zen_ups_label_errors AGENCY SELECT 정책 추가
-- UPS 등록 실패 상세(실패 사유)를 창고 화면(ups-receive)에서 AGENCY가 조회할 수 있어야 함.
-- 기존 20260716110000 마이그레이션의 의도적 제한("화주 미노출, ADMIN 전용 조회")은 SHIPPER에만 유지 —
-- AGENCY(대리점)는 창고 작업 주체로 실패 사유가 필요하므로 SELECT 허용.
-- 하위 화주 + 자가화주(TASK-B-274/DEF-B-046 패턴) 모두 커버.

DROP POLICY IF EXISTS "Agency can view shipper ups label errors" ON public.zen_ups_label_errors;

CREATE POLICY "Agency can view shipper ups label errors"
ON public.zen_ups_label_errors FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_label_errors.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);
