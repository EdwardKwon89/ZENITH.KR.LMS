-- 20260812050000_iss1087_ups_tracking_events_rls.sql
-- TASK-B-291 (Issue #1087 / DEF-B-061, High): zen_ups_tracking_events RLS 정책 전무 수정
--
-- 배경: zen_ups_tracking_events는 RLS가 ENABLE된 상태(20260626000000)에서 SELECT를 포함한
--       정책이 하나도 없고(pg_policies 0건), GRANT도 service_role에만 존재 — getUpsTrackingEvents()
--       (일반 로그인 사용자 RLS 클라이언트)가 항상 0건 반환해 트래킹 화면이 빈 목록 표출.
--
-- 수정: zen_tracking_configs(20260522002000/20260723060000) 정책 패턴을 동일 적용 —
--       GRANT SELECT 1줄 + 정책 3개 (Admin ALL / 화주 본인 SELECT / Agency SELECT).
--       과설계 금지 — 이 외 추가 확장 없음.

GRANT SELECT ON public.zen_ups_tracking_events TO authenticated;

DROP POLICY IF EXISTS "Admins have full access to ups tracking events" ON public.zen_ups_tracking_events;
CREATE POLICY "Admins have full access to ups tracking events"
ON public.zen_ups_tracking_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.zen_profiles
    WHERE id = auth.uid()
      AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  )
);

DROP POLICY IF EXISTS "Users can view ups tracking events of their own zen_orders" ON public.zen_ups_tracking_events;
CREATE POLICY "Users can view ups tracking events of their own zen_orders"
ON public.zen_ups_tracking_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = zen_ups_tracking_events.order_id
      AND (
        o.shipper_id = auth.uid()
        OR o.shipper_id IN (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Agency can view ups tracking events for shipper orders" ON public.zen_ups_tracking_events;
CREATE POLICY "Agency can view ups tracking events for shipper orders"
ON public.zen_ups_tracking_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE zen_orders.id = zen_ups_tracking_events.order_id
      AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  )
);
