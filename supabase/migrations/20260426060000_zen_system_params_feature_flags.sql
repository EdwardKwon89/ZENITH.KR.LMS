-- WBS 4.3.1.1 — zen_system_params, zen_param_audit_log, zen_feature_flags
-- 설계 명세: Ds_11_DETAIL_OPS_PARAMS.md (Section 16)
-- Sprint 5 사전 DB 구성 (Aiden 병행업무 B)
-- 작성일: 2026-04-26

-- ============================================================
-- 1. zen_system_params — 시스템 파라미터 테이블
-- ============================================================
CREATE TABLE public.zen_system_params (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL CHECK (category IN ('FINANCE','TRACKING','ROUTING','SYSTEM')),
  value_text      TEXT,
  value_numeric   NUMERIC(18,6),
  value_jsonb     JSONB,
  description     TEXT NOT NULL,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  updated_by      uuid REFERENCES public.profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zen_system_params ENABLE ROW LEVEL SECURITY;

-- Admin: 전체 SELECT + UPDATE
CREATE POLICY "Admins can select zen_system_params" ON public.zen_system_params
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update zen_system_params" ON public.zen_system_params
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

-- System(서버 액션 내부 호출): authenticated 이상 SELECT
-- (서버 사이드 캐시 유틸리티 getParam / getParamsByCategory 용도)
CREATE POLICY "Authenticated users can read zen_system_params" ON public.zen_system_params
  FOR SELECT USING (auth.role() = 'authenticated');

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_zen_system_params_timestamp
  BEFORE UPDATE ON public.zen_system_params
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ============================================================
-- 2. zen_param_audit_log — 파라미터 변경 감사 로그
-- ============================================================
CREATE TABLE public.zen_param_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key   TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  uuid NOT NULL REFERENCES public.profiles(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zen_param_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin: SELECT (감사 로그 조회)
CREATE POLICY "Admins can select zen_param_audit_log" ON public.zen_param_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

-- System: INSERT (updateSystemParam 서버 액션에서 호출)
CREATE POLICY "Authenticated users can insert zen_param_audit_log" ON public.zen_param_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 3. zen_feature_flags — Feature Flag 테이블
-- ============================================================
CREATE TABLE public.zen_feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT false,
  org_id      uuid REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, org_id)
);

ALTER TABLE public.zen_feature_flags ENABLE ROW LEVEL SECURITY;

-- Admin: 전체 CRUD
CREATE POLICY "Admins can select zen_feature_flags" ON public.zen_feature_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert zen_feature_flags" ON public.zen_feature_flags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update zen_feature_flags" ON public.zen_feature_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can delete zen_feature_flags" ON public.zen_feature_flags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );

-- User: 본인 org_id 행 SELECT (Feature Flag 게이팅 체크용)
CREATE POLICY "Users can read own org feature flags" ON public.zen_feature_flags
  FOR SELECT USING (
    org_id IS NULL OR
    org_id = (
      SELECT org_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_zen_feature_flags_timestamp
  BEFORE UPDATE ON public.zen_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ============================================================
-- 4. 초기 파라미터 시드 데이터
-- ============================================================
INSERT INTO public.zen_system_params (key, category, value_numeric, description) VALUES
  ('VAT_RATE',                      'FINANCE',  0.1,    '부가세율 (10%)'),
  ('EXCHANGE_RATE_USD_KRW',         'FINANCE',  1350.0, 'USD/KRW 환율 스냅샷 기준값'),
  ('TRACKING_DELAY_THRESHOLD_HOURS','TRACKING', 48.0,   '지연 알림 임계값 (시간)'),
  ('ROUTING_WEIGHT_ALPHA',          'ROUTING',  0.6,    '비용 스코어링 가중치 α'),
  ('ROUTING_WEIGHT_BETA',           'ROUTING',  0.4,    '시간 스코어링 가중치 β'),
  ('INVOICE_DUE_DAYS',              'FINANCE',  30.0,   '인보이스 기본 납기일 (일)')
ON CONFLICT (key) DO NOTHING;
