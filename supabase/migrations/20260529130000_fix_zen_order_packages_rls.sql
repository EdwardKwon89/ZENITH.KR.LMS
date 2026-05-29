-- UAT-02-03: zen_order_packages RLS 정책 누락
-- CORPORATE 사용자가 getOrderDetails()에서 패키지 데이터를 조회할 수 없던 문제
-- zen_orders와 동일한 접근 제어(is_org_member, role 체크)를 적용

CREATE POLICY "Admins can view all order packages"
ON public.zen_order_packages FOR SELECT
TO authenticated
USING (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Members can view own organization packages"
ON public.zen_order_packages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);

CREATE POLICY "Admins can manage all order packages"
ON public.zen_order_packages FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Members can insert packages for own organization orders"
ON public.zen_order_packages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
