-- DEF-117: zen_order_packages·zen_ups_labels RLS에 AGENCY CRUD 커버리지 추가
-- agency@zenith.kr로 UPS접수 시 zen_order_packages 조회 불가로 침묵 실패
-- DEF-114(zen_orders)·DEF-116(checkLabelPermission)에 이은 AGENCY is_org_member 결함 시리즈
-- Related: Issue #671, TASK-B-188

-- =====================================================
-- zen_order_packages
-- =====================================================

DROP POLICY IF EXISTS "Agency can view shipper order packages" ON public.zen_order_packages;

CREATE POLICY "Agency can view shipper order packages"
ON public.zen_order_packages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Agency can update shipper order packages" ON public.zen_order_packages;

CREATE POLICY "Agency can update shipper order packages"
ON public.zen_order_packages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_order_packages.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

-- =====================================================
-- zen_ups_labels (SELECT/UPDATE/INSERT)
-- =====================================================

DROP POLICY IF EXISTS "Agency can view shipper ups labels" ON public.zen_ups_labels;

CREATE POLICY "Agency can view shipper ups labels"
ON public.zen_ups_labels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Agency can insert shipper ups labels" ON public.zen_ups_labels;

CREATE POLICY "Agency can insert shipper ups labels"
ON public.zen_ups_labels FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Agency can update shipper ups labels" ON public.zen_ups_labels;

CREATE POLICY "Agency can update shipper ups labels"
ON public.zen_ups_labels FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);

-- =====================================================
-- zen_ups_label_errors (INSERT)
-- =====================================================

DROP POLICY IF EXISTS "Agency can insert shipper ups label errors" ON public.zen_ups_label_errors;

CREATE POLICY "Agency can insert shipper ups label errors"
ON public.zen_ups_label_errors FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_label_errors.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
