-- 20260811030000_iss1056_ups_labels_agency_self_shipper_rls.sql
-- TASK-B-278 (Issue #1056 / DEF-B-049, Critical): zen_ups_labels AGENCY RLS 자가화주 차단 수정
--
-- 배경: MASTER AIR(AGENCY)가 자기 자신을 화주로 등록한 자가화주 UPS 오더(shipper_id=본인 org_id,
--       agency_org_id=NULL)의 라벨 저장이 zen_ups_labels RLS 정책에 차단됨 — SHXK createorder는
--       성공(order_id 761342)했으나 이후 saveInitialLabel()의 INSERT가 42501로 실패, SHXK 서버에
--       orphan 오더만 남는 더 위험한 상태.
--
-- 원인: AGENCY 관련 RLS 정책 4개가 모두 `zen_orders.agency_org_id = (본인 org_id)` 단일 조건 —
--       자가화주 오더는 agency_org_id가 NULL이라 항상 거짓.
--
-- 수정: 4개 정책에 자가화주 조건 `OR zen_orders.shipper_id = (본인 org_id)` 추가 (DEF-B-046과 동일 해법).
--       기존 정책명 유지, DROP + CREATE 재생성.
--
-- 참고: 무관한 AGENCY(자기 오더도 하위 화주 오더도 아닌)는 여전히 차단됨을 보장 — 조건은
--       (agency_org_id = 본인) OR (shipper_id = 본인) 으로만 확장, 그 외 완화 없음.

-- =====================================================
-- zen_ups_labels — SELECT
-- =====================================================

DROP POLICY IF EXISTS "Agency can view shipper ups labels" ON public.zen_ups_labels;

CREATE POLICY "Agency can view shipper ups labels"
ON public.zen_ups_labels FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);

-- =====================================================
-- zen_ups_labels — INSERT
-- =====================================================

DROP POLICY IF EXISTS "Agency can insert shipper ups labels" ON public.zen_ups_labels;

CREATE POLICY "Agency can insert shipper ups labels"
ON public.zen_ups_labels FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);

-- =====================================================
-- zen_ups_labels — UPDATE
-- =====================================================

DROP POLICY IF EXISTS "Agency can update shipper ups labels" ON public.zen_ups_labels;

CREATE POLICY "Agency can update shipper ups labels"
ON public.zen_ups_labels FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);

-- =====================================================
-- zen_ups_labels — DELETE
-- =====================================================

DROP POLICY IF EXISTS "ups_labels_agency_delete" ON public.zen_ups_labels;

CREATE POLICY "ups_labels_agency_delete"
ON public.zen_ups_labels FOR DELETE
TO authenticated
USING (
  (get_my_role() = 'AGENCY'::text)
  AND EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_labels.order_id
      AND (
        zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        OR zen_orders.shipper_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);

-- =====================================================
-- GRANT: authenticated 롤에 DELETE 권한 보장 (ups_labels_agency_delete 정책 동작에 필요)
-- (기존 def117 마이그레이션이 SELECT/INSERT/UPDATE는 부여했으나 DELETE 누락 —
--  fresh DB(CI)에서 자가화주 AGENCY의 라벨 삭제가 permission denied로 막힘)
-- =====================================================

GRANT DELETE ON public.zen_ups_labels TO authenticated;
