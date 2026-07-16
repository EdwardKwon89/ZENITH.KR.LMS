-- Issue #526: zen_agency_shippers RLS 정책 SHIPPER/AGENCY_SHIPPER 누락
-- 기존 agency_shippers_shipper_select 정책이 CORPORATE/INDIVIDUAL만 허용
-- SHIPPER/AGENCY_SHIPPER 역할에서 본인 소속 Agency 조회가 전면 차단됨

DROP POLICY IF EXISTS "agency_shippers_shipper_select" ON public.zen_agency_shippers;

CREATE POLICY "agency_shippers_shipper_select" ON public.zen_agency_shippers
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('CORPORATE', 'INDIVIDUAL', 'SHIPPER', 'AGENCY_SHIPPER')
    AND shipper_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
