-- Issue #391: UPS 요금 스케줄링 시스템 — 예약 대기열 + 변경 이력 (1단계: DB 마이그레이션)
-- Mike (Team B) TASK-B-107

-- §1 — zen_ups_pricing_schedule (예약 대기열)
CREATE TABLE IF NOT EXISTS public.zen_ups_pricing_schedule (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type  TEXT NOT NULL CHECK (setting_type IN ('AGENCY_DISCOUNT','SHIPPER_DISCOUNT','VOLUMETRIC_DIVISOR')),
  target_ref    JSONB NOT NULL,
  new_value     NUMERIC NOT NULL,
  valid_from    DATE NOT NULL,
  valid_until   DATE,
  status        TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','APPLIED','CANCELLED')),
  created_by    UUID REFERENCES public.zen_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

COMMENT ON TABLE public.zen_ups_pricing_schedule IS 'UPS 요금 예약 대기열 (Issue #391). 적용일자 기반 예약 등록, 매일 자정 배치로 설정 테이블 반영.';
COMMENT ON COLUMN public.zen_ups_pricing_schedule.setting_type IS '설정 유형: AGENCY_DISCOUNT(Admin→Agency 할인율), SHIPPER_DISCOUNT(Agency→화주 할인율), VOLUMETRIC_DIVISOR(부피중량 기준값)';
COMMENT ON COLUMN public.zen_ups_pricing_schedule.target_ref IS '대상 식별자 JSONB. 예: {"agency_org_id":"...","zone_id":"..."} 또는 {"shipper_org_id":"...","zone_id":"..."}';
COMMENT ON COLUMN public.zen_ups_pricing_schedule.new_value IS '새로운 값. 할인율(0~1 미만) 또는 부피중량 기준값(5000/5500/6000)';
COMMENT ON COLUMN public.zen_ups_pricing_schedule.valid_from IS '적용 시작일. 신규 등록 시 반드시 내일 이후. 실제 적용은 이날 00:00:00부터.';
COMMENT ON COLUMN public.zen_ups_pricing_schedule.valid_until IS '적용 종료일. NULL이면 무기한. 설정 시 valid_from 이후여야 함. 실제 적용은 이날 23:59:59까지.';
COMMENT ON COLUMN public.zen_ups_pricing_schedule.status IS 'SCHEDULED(예약 대기) → APPLIED(배치 적용 완료) → CANCELLED(취소). SCHEDULED만 수정/취소 가능.';

ALTER TABLE public.zen_ups_pricing_schedule ENABLE ROW LEVEL SECURITY;

-- Admin/MANAGER: 전체 CRUD
CREATE POLICY "pricing_schedule_admin_all" ON public.zen_ups_pricing_schedule
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

-- AGENCY: 본인 org_id 대상 조회 + 등록/수정/취소 (setting_type이 AGENCY_DISCOUNT 또는 VOLUMETRIC_DIVISOR)
CREATE POLICY "pricing_schedule_agency_crud" ON public.zen_ups_pricing_schedule
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND (
      (setting_type = 'AGENCY_DISCOUNT' AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
      OR
      (setting_type = 'VOLUMETRIC_DIVISOR' AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND (
      (setting_type = 'AGENCY_DISCOUNT' AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
      OR
      (setting_type = 'VOLUMETRIC_DIVISOR' AND (target_ref ->> 'agency_org_id')::uuid = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    )
  );

CREATE INDEX idx_pricing_schedule_status ON public.zen_ups_pricing_schedule(status) WHERE status = 'SCHEDULED';
CREATE INDEX idx_pricing_schedule_valid_from ON public.zen_ups_pricing_schedule(valid_from) WHERE status = 'SCHEDULED';
CREATE INDEX idx_pricing_schedule_target_ref ON public.zen_ups_pricing_schedule USING GIN(target_ref);

GRANT ALL ON TABLE public.zen_ups_pricing_schedule TO service_role;
GRANT ALL ON TABLE public.zen_ups_pricing_schedule TO authenticated;

-- §2 — zen_ups_pricing_setting_audit_log (변경 이력)
CREATE TABLE IF NOT EXISTS public.zen_ups_pricing_setting_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type  TEXT NOT NULL,
  target_ref    JSONB NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('CREATE','UPDATE','CANCEL','APPLY','EXPIRE')),
  old_data      JSONB,
  new_data      JSONB,
  changed_by    UUID REFERENCES public.zen_profiles(id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.zen_ups_pricing_setting_audit_log IS 'UPS 요금 설정 변경 이력 (Issue #391). 모든 추가/변경/취소/만료 기록.';
COMMENT ON COLUMN public.zen_ups_pricing_setting_audit_log.action IS 'CREATE(신규 등록), UPDATE(수정), CANCEL(취소), APPLY(배치 적용), EXPIRE(만료 처리)';
COMMENT ON COLUMN public.zen_ups_pricing_setting_audit_log.old_data IS '변경 전 값 JSONB. APPLY는 이전 설정값, CREATE는 NULL.';
COMMENT ON COLUMN public.zen_ups_pricing_setting_audit_log.new_data IS '변경 후 값 JSONB. EXPIRE는 NULL.';

ALTER TABLE public.zen_ups_pricing_setting_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin/MANAGER: 전체 조회
CREATE POLICY "pricing_audit_log_admin_read" ON public.zen_ups_pricing_setting_audit_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

-- service_role: 전체 삽입 (배치에서 사용)
CREATE POLICY "pricing_audit_log_service_insert" ON public.zen_ups_pricing_setting_audit_log
  FOR INSERT TO service_role
  WITH CHECK (TRUE);

CREATE INDEX idx_pricing_audit_log_target ON public.zen_ups_pricing_setting_audit_log(setting_type, target_ref);
CREATE INDEX idx_pricing_audit_log_changed_at ON public.zen_ups_pricing_setting_audit_log(changed_at DESC);

GRANT ALL ON TABLE public.zen_ups_pricing_setting_audit_log TO service_role;
GRANT SELECT ON TABLE public.zen_ups_pricing_setting_audit_log TO authenticated;
