-- Phase 7 UPS 특송: 비행 계획 테이블 (출항 스케줄)
-- TASK-138 IMP-110

-- 1. zen_ups_flight_plans
CREATE TABLE public.zen_ups_flight_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES public.zen_ups_products(id),  -- NULL = 전체 제품
  flight_no       TEXT NOT NULL,
  origin_airport  VARCHAR(10) NOT NULL,  -- IATA 코드 (예: ICN)
  dest_airport    TEXT NOT NULL,
  etd             TIMESTAMPTZ,           -- 출발 예정 시각
  eta             TIMESTAMPTZ,           -- 도착 예정 시각
  frequency       TEXT,                  -- '매일', '주 3회' 등
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.zen_profiles(id),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- 2. RLS
ALTER TABLE public.zen_ups_flight_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ups_flight_plans_admin_all"
  ON public.zen_ups_flight_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_flight_plans_authenticated_select"
  ON public.zen_ups_flight_plans FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- 3. 인덱스
CREATE INDEX idx_ups_flight_plans_product ON public.zen_ups_flight_plans(product_id);
CREATE INDEX idx_ups_flight_plans_origin ON public.zen_ups_flight_plans(origin_airport);
CREATE INDEX idx_ups_flight_plans_active ON public.zen_ups_flight_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ups_flight_plans_valid ON public.zen_ups_flight_plans(valid_from, valid_until);
