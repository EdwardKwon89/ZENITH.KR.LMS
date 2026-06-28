-- E2E-26: zen_order_packages UPDATE/DELETE RLS 정책 누락 (intl_ref_locked 업데이트 불가)
-- markPackageIssued가 zen_order_packages.intl_ref_locked 업데이트 시 RLS에 차단됨
-- zen_orders UPDATE 정책과 동일한 패턴 적용

CREATE POLICY "Admins can update order packages"
ON public.zen_order_packages FOR UPDATE
TO authenticated
USING (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
)
WITH CHECK (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Members can update packages for own organization orders"
ON public.zen_order_packages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);

CREATE POLICY "Admins can delete order packages"
ON public.zen_order_packages FOR DELETE
TO authenticated
USING (
  get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Members can delete packages for own organization orders"
ON public.zen_order_packages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
    AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
