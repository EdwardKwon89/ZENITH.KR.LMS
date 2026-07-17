-- Issue #523: SHIPPER 역할이 zen_agency_shipper_zone_discounts에서 본인 소속 할인율 조회 허용
-- Mike (Team B) TASK-B-136

-- 기존 정책 유지 (Admin/Manager/ZENITH_SUPER_ADMIN 전체 CRUD, AGENCY 전체 CRUD)
-- 신규: SHIPPER/AGENCY_SHIPPER 역할은 본인 shipper_org_id에 해당하는 행만 SELECT 허용

CREATE POLICY "shipper_zone_discounts_shipper_select" ON public.zen_agency_shipper_zone_discounts
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SHIPPER', 'AGENCY_SHIPPER', 'CORPORATE', 'INDIVIDUAL')
    AND shipper_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
