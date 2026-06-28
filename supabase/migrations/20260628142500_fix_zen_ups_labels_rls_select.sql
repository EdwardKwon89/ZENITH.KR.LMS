-- E2E-26: zen_ups_labels SELECT RLS 정책 추가
-- https://github.com/anomalyco/ZENITH.KR.LMS/issues/110

CREATE POLICY "Admins can view ups labels"
ON public.zen_ups_labels FOR SELECT
TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

CREATE POLICY "Members can view ups labels for own organization packages"
ON public.zen_ups_labels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_order_packages
    INNER JOIN public.zen_orders ON zen_orders.id = zen_order_packages.order_id
    WHERE zen_order_packages.id = zen_ups_labels.package_id
    AND public.is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
