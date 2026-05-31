-- 20260531110000_imp093_tisa_dashboard_rls.sql
-- TISA Dashboard 실 연동: RLS 정책 확장 (IMP-093 · TASK-104)

-- §4 — zen_order_rate_snapshots: CORPORATE/INDIVIDUAL 조회 허용
-- 주문 소유 조직의 멤버는 자신의 오더에 대한 rate snapshot을 조회 가능
CREATE POLICY "order_members_can_view_rate_snapshots"
ON public.zen_order_rate_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = order_id
      AND public.is_org_member(auth.uid(), o.shipper_id)
  )
);
