-- DEF-117: zen_order_packages·zen_ups_labels RLS에 AGENCY SELECT/UPDATE 커버리지 추가
-- agency@zenith.kr로 UPS접수 시 zen_order_packages 조회 불가导致 침묵 실패
-- DEF-114(zen_orders)·DEF-116(checkLabelPermission)에 이은 3번째 AGENCY is_org_member 결함
-- Related: Issue #671, PR #668

-- =====================================================
-- zen_order_packages
-- =====================================================

-- 1. SELECT: AGENCY가 자소 화주의 패키지를 조회할 수 있도록 정책 추가
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

-- 2. UPDATE: AGENCY가 자소 화주의 패키지를 업데이트할 수 있도록 정책 추가
--    markAllPackagesIssued(intl_ref_locked 갱신), unlockAllPackagesIntlRef(출고취소 복원)에 필요
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
-- zen_ups_labels (DEF-117 추가: UPS 라벨 테이블도 동일 결함)
-- =====================================================

-- 3. SELECT: AGENCY가 자소 화주의 UPS 라벨을 조회할 수 있도록 정책 추가
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

-- 4. UPDATE: AGENCY가 자소 화주의 UPS 라벨을 업데이트할 수 있도록 정책 추가
--    voidUpsLabel, markAllPackagesIssued 등에 필요
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
