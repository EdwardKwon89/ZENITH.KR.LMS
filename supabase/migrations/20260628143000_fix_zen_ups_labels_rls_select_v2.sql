-- E2E-26: zen_ups_labels RLS 정책 확정
-- DROP 후 재생성 (이전 마이그레이션은 스키마 프리픽스 누락)

DROP POLICY IF EXISTS "Admins can update ups labels" ON public.zen_ups_labels;
DROP POLICY IF EXISTS "Members can update ups labels for own organization packages" ON public.zen_ups_labels;
DROP POLICY IF EXISTS "Admins can view ups labels" ON public.zen_ups_labels;
DROP POLICY IF EXISTS "Members can view ups labels for own organization packages" ON public.zen_ups_labels;
DROP POLICY IF EXISTS "Members can view and update ups labels for own organization packages" ON public.zen_ups_labels;

-- SELECT + UPDATE 통합 정책 (ADMIN / MANAGER / ZENITH_SUPER_ADMIN)
CREATE POLICY "ups_labels_admin_policy" ON public.zen_ups_labels
FOR ALL
TO authenticated
USING (
  public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
)
WITH CHECK (
  public.get_my_role() = ANY (ARRAY['ZENITH_SUPER_ADMIN'::text, 'ADMIN'::text, 'MANAGER'::text])
);

-- SELECT 정책 (조직 멤버 — 자신 조직의 패키지에 속한 레이블만)
CREATE POLICY "ups_labels_member_select_policy" ON public.zen_ups_labels
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_order_packages
    INNER JOIN public.zen_orders ON zen_orders.id = zen_order_packages.order_id
    WHERE zen_order_packages.id = zen_ups_labels.package_id
    AND public.is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);
