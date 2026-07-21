-- DEF-117: zen_order_packages·zen_ups_labels RLS에 AGENCY CRUD 커버리지 추가
-- agency@zenith.kr로 UPS접수 시 zen_order_packages 조회 불가导致 침묵 실패
-- DEF-114(zen_orders)·DEF-116(checkLabelPermission)에 이은 AGENCY is_org_member 결함 시리즈
-- Related: Issue #671, PR #672

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
-- zen_ups_labels (UPS 라벨 — SELECT/UPDATE/INSERT)
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

-- 4. INSERT: AGENCY가 자소 화주의 오더에 UPS 라벨을 생성할 수 있도록 정책 추가
--    saveInitialLabel() — registerUpsOrder 성공 시 zen_ups_labels INSERT 필요
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

-- 5. UPDATE: AGENCY가 자소 화주의 UPS 라벨을 업데이트할 수 있도록 정책 추가
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

-- =====================================================
-- zen_ups_label_errors (에러 로깅 — INSERT)
-- =====================================================

-- 6. INSERT: AGENCY가 자소 화주의 UPS 라벨 에러를 기록할 수 있도록 정책 추가
--    registerUpsOrder 실패 시 zen_ups_label_errors INSERT 필요 (감사 기록)
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
