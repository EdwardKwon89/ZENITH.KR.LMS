-- Phase 7.2 UPS 요율표 구조 정밀화: 20kg 초과 티어 요금 + DWB + Freight 최소운임
-- An-14 §12-1 #1·#4·#5 · TASK-180 · IMP-146

DROP TABLE IF EXISTS public.zen_ups_weight_tier_rates CASCADE;
DROP TABLE IF EXISTS public.zen_ups_freight_minimums CASCADE;

-- 1. zen_ups_weight_tier_rates 테이블 생성 (20kg 초과 per-kg 단가 요율)
CREATE TABLE public.zen_ups_weight_tier_rates (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             UUID NOT NULL REFERENCES public.zen_ups_products(id) ON DELETE CASCADE,
  zone_id                UUID NOT NULL REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE,
  tier_min_kg            NUMERIC(6,2) NOT NULL CHECK (tier_min_kg >= 0),
  tier_max_kg            NUMERIC(6,2) CHECK (tier_max_kg IS NULL OR tier_max_kg > tier_min_kg), -- NULL은 최상위(상한 없음) 구간
  price_per_kg_selling   NUMERIC(18,2) NOT NULL CHECK (price_per_kg_selling >= 0),
  price_per_kg_cost      NUMERIC(18,2) NOT NULL CHECK (price_per_kg_cost >= 0),
  currency               VARCHAR(3) NOT NULL DEFAULT 'KRW',
  valid_from             DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until            DATE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES public.zen_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_zone_tier UNIQUE (product_id, zone_id, tier_min_kg, valid_from),
  CONSTRAINT chk_valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from)
);

COMMENT ON TABLE public.zen_ups_weight_tier_rates IS '20kg 초과 화물에 적용되는 구간별 kg당 요율 테이블. An-14 §12-1 #1.';
COMMENT ON COLUMN public.zen_ups_weight_tier_rates.tier_min_kg IS '구간 최소 중량 (예: 21.00)';
COMMENT ON COLUMN public.zen_ups_weight_tier_rates.tier_max_kg IS '구간 최대 중량 (예: 44.00, 최상위 구간은 NULL)';

ALTER TABLE public.zen_ups_weight_tier_rates ENABLE ROW LEVEL SECURITY;

-- RLS: ADMIN/MANAGER: 전체 CRUD
CREATE POLICY "ups_weight_tier_rates_admin_all"
  ON public.zen_ups_weight_tier_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

-- RLS: AGENCY: 활성 요율 조회
CREATE POLICY "ups_weight_tier_rates_agency_select"
  ON public.zen_ups_weight_tier_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role = 'AGENCY'
    )
  );

-- RLS: CORPORATE/INDIVIDUAL: 활성 요율 조회
CREATE POLICY "ups_weight_tier_rates_shipper_select"
  ON public.zen_ups_weight_tier_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('CORPORATE','INDIVIDUAL')
    )
  );

CREATE INDEX idx_ups_weight_tier_rates_prod_zone ON public.zen_ups_weight_tier_rates(product_id, zone_id);
CREATE INDEX idx_ups_weight_tier_rates_range ON public.zen_ups_weight_tier_rates(tier_min_kg, tier_max_kg);


-- 2. zen_ups_freight_minimums 테이블 생성 (Freight 계열 상품 최소운임)
CREATE TABLE public.zen_ups_freight_minimums (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            UUID NOT NULL REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES public.zen_ups_products(id) ON DELETE CASCADE,
  min_charge_selling NUMERIC(18,2) NOT NULL CHECK (min_charge_selling >= 0),
  min_charge_cost    NUMERIC(18,2) NOT NULL CHECK (min_charge_cost >= 0),
  currency           VARCHAR(3) NOT NULL DEFAULT 'KRW',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES public.zen_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_zone_product_min UNIQUE (zone_id, product_id)
);

COMMENT ON TABLE public.zen_ups_freight_minimums IS 'Freight 계열 상품에 대해 적용되는 Zone별 최소 운임(Flat floor) 테이블. An-14 §12-1 #5.';

ALTER TABLE public.zen_ups_freight_minimums ENABLE ROW LEVEL SECURITY;

-- RLS: ADMIN/MANAGER: 전체 CRUD
CREATE POLICY "ups_freight_minimums_admin_all"
  ON public.zen_ups_freight_minimums FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

-- RLS: AGENCY: 활성 최소운임 조회
CREATE POLICY "ups_freight_minimums_agency_select"
  ON public.zen_ups_freight_minimums FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role = 'AGENCY'
    )
  );

-- RLS: CORPORATE/INDIVIDUAL: 활성 최소운임 조회
CREATE POLICY "ups_freight_minimums_shipper_select"
  ON public.zen_ups_freight_minimums FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('CORPORATE','INDIVIDUAL')
    )
  );

CREATE INDEX idx_ups_freight_minimums_zone_prod ON public.zen_ups_freight_minimums(zone_id, product_id);


-- 3. 시드 데이터 적재 (20kg 초과 티어 요율 + Freight 최소운임)

-- 3-1. zen_ups_weight_tier_rates 시드 (21-44, 45-70, 71-99, 100-299, 300-499, 500-999, 1000+ kg 구간)
INSERT INTO public.zen_ups_weight_tier_rates 
  (product_id, zone_id, tier_min_kg, tier_max_kg, price_per_kg_selling, price_per_kg_cost, valid_from)
WITH
  prods AS (
    SELECT id, product_code 
    FROM public.zen_ups_products
    WHERE product_code IN ('WW_EXPRESS_DOC', 'WW_EXPRESS_NONDOC', 'WW_SAVER_DOC', 'WW_SAVER_NONDOC', 'WW_EXPEDITED', 'WW_FLIGHT')
  ),
  zns    AS (SELECT id, zone_code FROM public.zen_ups_zones WHERE zone_code != 'Z1'),
  -- 중량 구간 정의
  tiers (tier_min_kg, tier_max_kg, tier_factor) AS (
    VALUES 
      (21.00,  44.00,  1.00),
      (45.00,  70.00,  0.98),
      (71.00,  99.00,  0.95),
      (100.00, 299.00, 0.93),
      (300.00, 499.00, 0.90),
      (500.00, 999.00, 0.88),
      (1000.00, NULL,   0.85)
  ),
  -- Zone별 기본 1kg당 요율 (base_rates 시드의 1/20 수준으로 연속성 유지)
  zone_base_rates AS (
    SELECT id,
      CASE zone_code
        WHEN 'Z2'  THEN 500.00 WHEN 'Z3'  THEN 600.00 WHEN 'Z4'  THEN 750.00
        WHEN 'Z5'  THEN 800.00 WHEN 'Z6'  THEN 900.00 WHEN 'Z7'  THEN 950.00
        WHEN 'Z8'  THEN 850.00 WHEN 'Z9'  THEN 1100.00 WHEN 'Z10' THEN 1250.00
      END AS base_selling_rate,
      CASE zone_code
        WHEN 'Z2'  THEN 400.00  WHEN 'Z3'  THEN 480.00  WHEN 'Z4'  THEN 600.00
        WHEN 'Z5'  THEN 640.00  WHEN 'Z6'  THEN 720.00  WHEN 'Z7'  THEN 760.00
        WHEN 'Z8'  THEN 680.00  WHEN 'Z9'  THEN 880.00  WHEN 'Z10' THEN 1000.00
      END AS base_cost_rate
    FROM zns
  ),
  -- 제품별 가중치 (base_rates 시드와 동일)
  prod_factors AS (
    SELECT id,
      CASE product_code
        WHEN 'WW_EXPRESS_DOC'    THEN 0.7
        WHEN 'WW_EXPRESS_NONDOC' THEN 1.0
        WHEN 'WW_SAVER_DOC'      THEN 0.6
        WHEN 'WW_SAVER_NONDOC'   THEN 0.85
        WHEN 'WW_EXPEDITED'      THEN 1.2
        WHEN 'WW_FLIGHT'         THEN 2.0
      END AS factor
    FROM prods
  )
SELECT
  pf.id AS product_id,
  zr.id AS zone_id,
  t.tier_min_kg,
  t.tier_max_kg,
  ROUND(zr.base_selling_rate * t.tier_factor * pf.factor, 2) AS price_per_kg_selling,
  ROUND(zr.base_cost_rate * t.tier_factor * pf.factor, 2) AS price_per_kg_cost,
  CURRENT_DATE AS valid_from
FROM prod_factors pf
CROSS JOIN zone_base_rates zr
CROSS JOIN tiers t
ON CONFLICT (product_id, zone_id, tier_min_kg, valid_from) DO NOTHING;

-- 3-2. zen_ups_freight_minimums 시드 (Freight 상품에 적용할 Zone별 최소운임)
INSERT INTO public.zen_ups_freight_minimums
  (zone_id, product_id, min_charge_selling, min_charge_cost)
WITH
  prods AS (SELECT id, product_code FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT'),
  zns    AS (SELECT id, zone_code FROM public.zen_ups_zones WHERE zone_code != 'Z1'),
  zone_multipliers AS (
    SELECT id,
      CASE zone_code
        WHEN 'Z2'  THEN 1.0
        WHEN 'Z3'  THEN 1.2
        WHEN 'Z4'  THEN 1.5
        WHEN 'Z5'  THEN 1.6
        WHEN 'Z6'  THEN 1.8
        WHEN 'Z7'  THEN 1.9
        WHEN 'Z8'  THEN 1.7
        WHEN 'Z9'  THEN 2.2
        WHEN 'Z10' THEN 2.5
      END AS mult
    FROM zns
  )
SELECT
  zm.id AS zone_id,
  p.id AS product_id,
  ROUND(150000.00 * zm.mult, 2) AS min_charge_selling,
  ROUND(120000.00 * zm.mult, 2) AS min_charge_cost
FROM prods p
CROSS JOIN zone_multipliers zm
ON CONFLICT (zone_id, product_id) DO NOTHING;
