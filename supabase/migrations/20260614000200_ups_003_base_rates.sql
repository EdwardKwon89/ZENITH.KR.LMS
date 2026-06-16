-- Phase 7 UPS 특송: 기본 요율 테이블 (구간 × 제품 × 중량 0.5kg 단위)
-- TASK-138 IMP-110

-- 1. zen_ups_base_rates
CREATE TABLE public.zen_ups_base_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.zen_ups_products(id),
  zone_id         UUID NOT NULL REFERENCES public.zen_ups_zones(id),
  weight_kg       NUMERIC(8,1) NOT NULL CHECK (weight_kg > 0 AND MOD(weight_kg * 2, 1) = 0),
  selling_price   NUMERIC(18,2) NOT NULL CHECK (selling_price >= 0),
  cost_price      NUMERIC(18,2) NOT NULL CHECK (cost_price >= 0),
  currency        VARCHAR(3) DEFAULT 'KRW',
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.zen_profiles(id),
  UNIQUE(product_id, zone_id, weight_kg, valid_from),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- 2. RLS
ALTER TABLE public.zen_ups_base_rates ENABLE ROW LEVEL SECURITY;

-- ADMIN/MANAGER: 전체 CRUD
CREATE POLICY "ups_base_rates_admin_all"
  ON public.zen_ups_base_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

-- AGENCY: 활성 요율 조회 (판매가만 — cost_price 는 SELECT 에서 반환되지만 row 레벨 제어)
CREATE POLICY "ups_base_rates_agency_select"
  ON public.zen_ups_base_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role = 'AGENCY'
    )
  );

-- CORPORATE/INDIVIDUAL: 활성 요율 조회
CREATE POLICY "ups_base_rates_shipper_select"
  ON public.zen_ups_base_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('CORPORATE','INDIVIDUAL')
    )
  );

-- 3. 인덱스
CREATE INDEX idx_ups_base_rates_product_zone ON public.zen_ups_base_rates(product_id, zone_id);
CREATE INDEX idx_ups_base_rates_weight ON public.zen_ups_base_rates(weight_kg);
CREATE INDEX idx_ups_base_rates_active ON public.zen_ups_base_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ups_base_rates_valid ON public.zen_ups_base_rates(valid_from, valid_until);
