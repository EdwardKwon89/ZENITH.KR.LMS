-- UAT-02: 경로 선택 시 "경로 등록 오류" 발생
-- zen_order_routes RLS 정책 0건 → UPSERT 차단
-- zen_orders UPDATE 정책 ADMIN/MANAGER 전용 → CORPORATE/INDIVIDUAL route_option_id 업데이트 차단

-- §1 — zen_order_routes: org 멤버 및 ADMIN이 route 선택/조회 가능
DROP POLICY IF EXISTS "Org members can manage order routes" ON public.zen_order_routes;
CREATE POLICY "Org members can manage order routes" ON public.zen_order_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = zen_order_routes.order_id
        AND public.is_org_member(auth.uid(), o.shipper_id)
    )
  );

DROP POLICY IF EXISTS "Admins can manage all order routes" ON public.zen_order_routes;
CREATE POLICY "Admins can manage all order routes" ON public.zen_order_routes
  FOR ALL
  TO authenticated
  USING (public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text]));

-- §2 — zen_orders: org 멤버가 route_option_id 업데이트 가능
DROP POLICY IF EXISTS "Org members can update order route" ON public.zen_orders;
CREATE POLICY "Org members can update order route" ON public.zen_orders
  FOR UPDATE
  TO authenticated
  USING (public.is_org_member(auth.uid(), shipper_id))
  WITH CHECK (public.is_org_member(auth.uid(), shipper_id));
