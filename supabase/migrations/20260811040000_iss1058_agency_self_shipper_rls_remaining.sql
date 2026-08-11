-- 20260811040000_iss1058_agency_self_shipper_rls_remaining.sql
-- TASK-B-279 (Issue #1058 / DEF-B-051, High): AGENCY 자가화주 RLS 잔여 차단 4곳 수정
--
-- 배경: DEF-B-049(TASK-B-278, #1056) 완료 후, AGENCY가 자기 자신을 화주로 등록한 자가화주
--       오더(shipper_id=본인 org_id, agency_org_id=NULL)에 대해 여전히 차단되는 RLS 정책 4곳을
--       Jaison이 pg_policies 전수 재검증으로 확정.
--       (Dave 보고 7곳 중 3곳 — order_costs/order_packages/order_rate_snapshots — 은 이미
--        is_org_member(shipper_id) 대체 정책으로 커버되어 오탐, 범위 제외)
--
-- 원인: 아래 4곳 정책이 모두 `agency_org_id = (본인 org_id)` 단일 조건 — 자가화주 오더는
--       agency_org_id가 NULL이라 항상 거짓.
--
-- 수정: DEF-B-049와 동일 해법 — shipper_id 기반 OR 조건 추가. 기존 정책명 유지, DROP+CREATE
--       재생성 (신규 필요 시 신규 정책 추가).
--
-- 참고: 무관한 AGENCY(자기 오더도 하위 화주 오더도 아닌)는 여전히 차단됨을 보장 — 조건은
--       (agency_org_id = 본인) OR (shipper_id = 본인) 으로만 확장, 그 외 완화 없음.

-- =====================================================
-- 1) zen_tracking_configs — UPDATE (자가화주 트래킹 설정 갱신)
--    기존 SELECT 정책("Users can view tracking of their own zen_orders")과 동일한
--    shipper_id 조건을 UPDATE에 추가 (USING + WITH CHECK)
-- =====================================================

DROP POLICY IF EXISTS "Agency can update tracking configs for shipper orders" ON public.zen_tracking_configs;

CREATE POLICY "Agency can update tracking configs for shipper orders"
ON public.zen_tracking_configs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_tracking_configs.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);

-- =====================================================
-- 2) zen_ups_label_documents — DELETE (자가화주 라벨 문서 레코드 삭제)
--    기존 INSERT/SELECT의 ups_label_docs_shipper_* 패턴을 DELETE에도 신규 추가
-- =====================================================

DROP POLICY IF EXISTS "ups_label_docs_shipper_delete" ON public.zen_ups_label_documents;

CREATE POLICY "ups_label_docs_shipper_delete"
ON public.zen_ups_label_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_label_documents.order_id
      AND is_org_member(auth.uid(), zen_orders.shipper_id)
  )
);

-- =====================================================
-- 3) zen_ups_label_errors — INSERT (SHXK 호출 실패 시 에러 기록 — 가장 심각)
--    agency_org_id 단일 체크에 OR is_org_member(shipper_id) 추가
-- =====================================================

DROP POLICY IF EXISTS "Agency can insert shipper ups label errors" ON public.zen_ups_label_errors;

CREATE POLICY "Agency can insert shipper ups label errors"
ON public.zen_ups_label_errors FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_label_errors.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR is_org_member(auth.uid(), zen_orders.shipper_id)
      )
  )
);

-- =====================================================
-- 4) storage.objects — ups-labels/{order_id} 정책 3개 (INSERT/SELECT/DELETE)
--    라벨 PDF 파일 실물 업로드/조회/삭제 — agency_org_id join에 shipper_id OR 추가
-- =====================================================

DROP POLICY IF EXISTS "Allow agency to upload ups labels" ON storage.objects;

CREATE POLICY "Allow agency to upload ups labels"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND storage.objects.name LIKE 'ups-labels/%'
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles p
    JOIN public.zen_orders o ON (o.agency_org_id = p.org_id OR o.shipper_id = p.org_id)
    WHERE p.id = auth.uid()
      AND p.role = 'AGENCY'
      AND o.id = (storage.foldername(name))[2]::uuid
  )
);

DROP POLICY IF EXISTS "Allow agency to view ups labels" ON storage.objects;

CREATE POLICY "Allow agency to view ups labels"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND storage.objects.name LIKE 'ups-labels/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      JOIN public.zen_orders o ON (o.agency_org_id = p.org_id OR o.shipper_id = p.org_id)
      WHERE p.id = auth.uid()
        AND p.role = 'AGENCY'
        AND o.id = (storage.foldername(name))[2]::uuid
    )
    OR EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
    )
  )
);

DROP POLICY IF EXISTS "Allow agency to delete ups labels" ON storage.objects;

CREATE POLICY "Allow agency to delete ups labels"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices'
  AND storage.objects.name LIKE 'ups-labels/%'
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles p
    JOIN public.zen_orders o ON (o.agency_org_id = p.org_id OR o.shipper_id = p.org_id)
    WHERE p.id = auth.uid()
      AND p.role = 'AGENCY'
      AND o.id = (storage.foldername(name))[2]::uuid
  )
);
