-- 20260606020000_p6_service_rate_tables.sql
-- [P6-SPR-01] 신규 요율 테이블 2종 생성 + RLS
-- Phase 6: 신규 서비스 역할 모델 + 멀티 서비스 배정 구조 (v1.5.0)

-- §1 — zen_customs_rates (통관 서비스 요율)
CREATE TABLE IF NOT EXISTS public.zen_customs_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES zen_organizations(id),
  country_code    VARCHAR(3) NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  cost_per_kg     NUMERIC(18,2),
  cost_per_cbm    NUMERIC(18,2),
  fixed_fee       NUMERIC(18,2) DEFAULT 0,
  transit_days    INT,
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  version_no      INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  UNIQUE(org_id, country_code, valid_from)
);

ALTER TABLE public.zen_customs_rates ENABLE ROW LEVEL SECURITY;

-- 화주 + ADMIN + 운송사: 활성 요율 조회
CREATE POLICY "customs_rates_select"
  ON public.zen_customs_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
      OR org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('CORPORATE', 'INDIVIDUAL', 'CARRIER')
    )
  );

-- ADMIN/MANAGER + CUSTOMS_BROKER(본인 org): 등록/수정/삭제
CREATE POLICY "customs_rates_write"
  ON public.zen_customs_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CUSTOMS_BROKER'
      AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

CREATE POLICY "customs_rates_update"
  ON public.zen_customs_rates FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CUSTOMS_BROKER'
      AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

CREATE POLICY "customs_rates_delete"
  ON public.zen_customs_rates FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CUSTOMS_BROKER'
      AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

-- §2 — zen_delivery_rates (배송 서비스 요율: LOCAL / TOTAL)
CREATE TABLE IF NOT EXISTS public.zen_delivery_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES zen_organizations(id),
  service_type    VARCHAR(10) NOT NULL,
  country_code    VARCHAR(3),
  transport_mode  VARCHAR(10),
  origin_code     VARCHAR(10),
  dest_code       VARCHAR(10),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  cost_per_kg     NUMERIC(18,2),
  cost_per_cbm    NUMERIC(18,2),
  transit_days    INT,
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  version_no      INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  CONSTRAINT chk_delivery_rates_type CHECK (
    (service_type = 'LOCAL' AND country_code IS NOT NULL)
    OR (service_type = 'TOTAL' AND transport_mode IS NOT NULL
        AND origin_code IS NOT NULL AND dest_code IS NOT NULL)
  )
);

ALTER TABLE public.zen_delivery_rates ENABLE ROW LEVEL SECURITY;

-- 화주 + ADMIN: 활성 요율 조회
CREATE POLICY "delivery_rates_select"
  ON public.zen_delivery_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
      OR org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('CORPORATE', 'INDIVIDUAL', 'CARRIER')
    )
  );

-- ADMIN/MANAGER + DELIVERY_AGENT(본인 org): 등록/수정/삭제
CREATE POLICY "delivery_rates_insert"
  ON public.zen_delivery_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'DELIVERY_AGENT'
      AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

CREATE POLICY "delivery_rates_update"
  ON public.zen_delivery_rates FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'DELIVERY_AGENT'
      AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

CREATE POLICY "delivery_rates_delete"
  ON public.zen_delivery_rates FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'DELIVERY_AGENT'
      AND org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    )
  );

-- §3 — zen_rate_cards: CARRIER role INSERT/UPDATE 허용 (RLS 추가)
-- CARRIER는 본인 carrier_id(→zen_carriers→org_id) 요율만 입력 가능
CREATE POLICY "carrier_rate_cards_insert"
  ON public.zen_rate_cards FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CARRIER'
      AND carrier_id IN (
        SELECT id FROM public.zen_carriers
        WHERE org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
      )
    )
  );

CREATE POLICY "carrier_rate_cards_update"
  ON public.zen_rate_cards FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'CARRIER'
      AND carrier_id IN (
        SELECT id FROM public.zen_carriers
        WHERE org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
      )
    )
  );

-- §4 — zen_rate_cards_public View (CARRIER에 platform_fee_rate NULL)
CREATE OR REPLACE VIEW public.zen_rate_cards_public AS
SELECT
  id, carrier_id, transport_mode, currency, tiers,
  valid_from, valid_until, is_active,
  carrier_cost, margin_rate,
  CASE WHEN (auth.jwt() -> 'app_metadata' ->> 'role') = 'CARRIER'
    THEN NULL
    ELSE platform_fee_rate
  END AS platform_fee_rate
FROM public.zen_rate_cards;
