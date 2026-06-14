-- Phase 7 UPS 특송: 유류 할증 테이블 (주별 갱신)
-- TASK-138 IMP-110

-- 1. zen_ups_fuel_surcharges
CREATE TABLE public.zen_ups_fuel_surcharges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES public.zen_ups_products(id),  -- NULL = 전체 제품 적용
  effective_week  DATE NOT NULL,        -- 해당 주 월요일 기준
  selling_rate    NUMERIC(8,4) NOT NULL CHECK (selling_rate >= 0),  -- 예: 0.2350 = 23.50%
  cost_rate       NUMERIC(8,4) NOT NULL CHECK (cost_rate >= 0),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.zen_profiles(id),
  UNIQUE(product_id, effective_week)
);

-- 2. RLS
ALTER TABLE public.zen_ups_fuel_surcharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ups_fuel_surcharges_admin_all"
  ON public.zen_ups_fuel_surcharges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_fuel_surcharges_authenticated_select"
  ON public.zen_ups_fuel_surcharges FOR SELECT
  TO authenticated
  USING (true);

-- 3. 인덱스
CREATE INDEX idx_ups_fuel_surcharges_week ON public.zen_ups_fuel_surcharges(effective_week DESC);
CREATE INDEX idx_ups_fuel_surcharges_product ON public.zen_ups_fuel_surcharges(product_id);
