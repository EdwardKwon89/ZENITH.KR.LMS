-- Issue #391: RLS 정책 업데이트 — AGENCY 역할 SHIPPER_DISCOUNT 조회/등록 허용
-- Mike (Team B) TASK-B-110

-- §1 — zen_ups_pricing_schedule: 기존 AGENCY 정책에 SHIPPER_DISCOUNT 추가
DROP POLICY IF EXISTS "pricing_schedule_agency_crud" ON public.zen_ups_pricing_schedule;

CREATE POLICY "pricing_schedule_agency_crud" ON public.zen_ups_pricing_schedule
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND (
      (setting_type IN ('AGENCY_DISCOUNT', 'VOLUMETRIC_DIVISOR') AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
      OR
      (setting_type = 'SHIPPER_DISCOUNT' AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND (
      (setting_type IN ('AGENCY_DISCOUNT', 'VOLUMETRIC_DIVISOR') AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
      OR
      (setting_type = 'SHIPPER_DISCOUNT' AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    )
  );

-- §2 — zen_ups_pricing_setting_audit_log: AGENCY용 SELECT 정책 신설
CREATE POLICY "pricing_audit_log_agency_read" ON public.zen_ups_pricing_setting_audit_log
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND setting_type = 'SHIPPER_DISCOUNT'
    AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
