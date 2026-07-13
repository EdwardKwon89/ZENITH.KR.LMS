-- E2E-26: zen_ups_labels RLS 정책 (SELECT + UPDATE 누락)
-- voidUpsLabel → markLabelVoided가 is_voided 업데이트 시 RLS에 차단됨
-- 또한 SELECT 정책이 없어 today released orders 조회 시 ups_labels 서브쿼리 실패

CREATE POLICY "Admins can view ups labels"
ON public.zen_ups_labels FOR SELECT
TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Admins can update ups labels"
ON public.zen_ups_labels FOR UPDATE
TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
)
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Members can view and update ups labels for own organization packages"
ON public.zen_ups_labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_order_packages
    INNER JOIN public.zen_orders ON zen_orders.id = zen_order_packages.order_id
    WHERE zen_order_packages.id = zen_ups_labels.package_id
    AND public.is_org_member(auth.uid(), zen_orders.shipper_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_order_packages
    INNER JOIN public.zen_orders ON zen_orders.id = zen_order_packages.order_id
    WHERE zen_order_packages.id = zen_ups_labels.package_id
    AND public.is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
