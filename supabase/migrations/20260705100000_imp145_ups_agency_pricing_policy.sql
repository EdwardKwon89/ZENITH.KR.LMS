-- Phase 7.1 UPS 요금관리 보완: Agency 할인율 정책 + Agency 부가요금 + rate_overrides 원가 자동계산
-- An-14 §3-1·3-2·3-3·3-7 · TASK-171 · IMP-145

-- §1 — zen_agency_pricing_policies: Admin이 설정하는 대리점별 UPS 할인율
CREATE TABLE IF NOT EXISTS public.zen_agency_pricing_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL UNIQUE REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
  discount_rate   NUMERIC(5,4) NOT NULL CHECK (discount_rate >= 0 AND discount_rate < 1),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES public.zen_profiles(id)
);

COMMENT ON TABLE public.zen_agency_pricing_policies IS 'Admin이 대리점별로 설정하는 UPS 판매가 대비 할인율. 대리점 원가 = UPS 판매가 x (1-discount_rate). An-14 R3.';
COMMENT ON COLUMN public.zen_agency_pricing_policies.discount_rate IS 'Admin 전용 설정값. Agency는 SELECT만 가능(수정 불가) — 대리점 원가 통제권은 Admin에게 있음.';

ALTER TABLE public.zen_agency_pricing_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_pricing_policies_admin_all" ON public.zen_agency_pricing_policies
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

CREATE POLICY "agency_pricing_policies_agency_select" ON public.zen_agency_pricing_policies
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

CREATE INDEX idx_agency_pricing_policies_org ON public.zen_agency_pricing_policies(agency_org_id) WHERE is_active = TRUE;

-- §2 — zen_agency_other_charges: 대리점별 부가요금(OC) 오버라이드
-- zen_ups_other_charges(공통코드)를 그대로 두고 Agency가 있으면 우선 적용하는 오버라이드 패턴
-- (zen_agency_rate_overrides와 대칭 구조). An-14 R8.
CREATE TABLE IF NOT EXISTS public.zen_agency_other_charges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
  other_charge_id UUID NOT NULL REFERENCES public.zen_ups_other_charges(id) ON DELETE CASCADE,
  selling_price   NUMERIC(18,2) NOT NULL CHECK (selling_price >= 0),
  cost_price      NUMERIC(18,2) NOT NULL CHECK (cost_price >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public.zen_profiles(id),
  UNIQUE(agency_org_id, other_charge_id)
);

COMMENT ON TABLE public.zen_agency_other_charges IS '대리점별 부가요금(OC) 금액 오버라이드. 미등록 시 zen_ups_other_charges 공통코드 기본값 상속. An-14 R8.';

ALTER TABLE public.zen_agency_other_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_other_charges_admin_all" ON public.zen_agency_other_charges
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

CREATE POLICY "agency_other_charges_agency_own" ON public.zen_agency_other_charges
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

CREATE INDEX idx_agency_other_charges_agency ON public.zen_agency_other_charges(agency_org_id) WHERE is_active = TRUE;

-- §3 — zen_agency_rate_overrides: cost_price 자동계산 트리거 (An-14 §3-3)
-- Agency가 selling_price/cost_price를 무엇을 보내든, cost_price는 서버가 정책에 따라 재산출한다.
-- 정책(zen_agency_pricing_policies)이 없는 대리점은 요율 등록 자체를 차단 — 데이터 정합성 보장.
CREATE OR REPLACE FUNCTION public.trg_agency_rate_override_calc_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount_rate NUMERIC(5,4);
  v_base_selling  NUMERIC(18,2);
BEGIN
  SELECT discount_rate INTO v_discount_rate
  FROM public.zen_agency_pricing_policies
  WHERE agency_org_id = NEW.agency_org_id AND is_active = TRUE;

  IF v_discount_rate IS NULL THEN
    RAISE EXCEPTION 'zen_agency_pricing_policies에 활성 할인율 정책이 없는 대리점(%)은 요율을 등록할 수 없습니다.', NEW.agency_org_id;
  END IF;

  SELECT selling_price INTO v_base_selling
  FROM public.zen_ups_base_rates
  WHERE id = NEW.base_rate_id;

  IF v_base_selling IS NULL THEN
    RAISE EXCEPTION '기준 요율(base_rate_id=%)을 찾을 수 없습니다.', NEW.base_rate_id;
  END IF;

  -- An-14 R3: 대리점 원가 = UPS 판매가 x (1 - 할인율). Agency가 보낸 cost_price 값은 무시한다.
  NEW.cost_price := ROUND(v_base_selling * (1 - v_discount_rate), 2);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agency_rate_override_calc_cost ON public.zen_agency_rate_overrides;
CREATE TRIGGER trg_agency_rate_override_calc_cost
  BEFORE INSERT OR UPDATE OF base_rate_id, selling_price, cost_price
  ON public.zen_agency_rate_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_agency_rate_override_calc_cost();

-- §4 — Other Charge 신규 4종 (An-14 §0-1 B — SNTL 원자료 대조, 유류할증 미부과 부가수수료)
INSERT INTO public.zen_ups_other_charges
  (charge_code, charge_name, unit, fuel_surcharge_applicable, selling_price, cost_price)
VALUES
  ('DUTY_AMOUNT',       'Duty Amount (관세)',                      'LOT', FALSE, 0, 0),
  ('TARIFF_LINES_FEE',  'Additional Tariff Lines Fee',             'LOT', FALSE, 0, 0),
  ('INTL_PROCESSING_FEE','International Processing Fee',           'LOT', FALSE, 0, 0),
  ('DISBURSEMENT_FEE',  'Disbursement Fee',                        'LOT', FALSE, 0, 0)
ON CONFLICT (charge_code) DO NOTHING;

-- §5 — Shipper 세션이 Agency의 원가/할인율을 노출하지 않고 "판매가"만 조회할 수 있는 SECURITY DEFINER 함수
-- (An-14 설계 시 발견한 보안 이점: discount_rate·cost_price는 Admin/Agency 내부 정보이며 화주에게 노출되면 안 됨)
CREATE OR REPLACE FUNCTION public.fn_get_ups_agency_selling_price(
  p_agency_org_id UUID,
  p_base_rate_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT selling_price
  FROM public.zen_agency_rate_overrides
  WHERE agency_org_id = p_agency_org_id
    AND base_rate_id = p_base_rate_id
    AND is_active = TRUE
    AND valid_from <= p_reference_date
    AND (valid_until IS NULL OR valid_until >= p_reference_date)
    -- 호출자 검증: service_role(서버 내부 호출)·ADMIN/MANAGER, 해당 대리점 본인, 또는 해당 대리점 소속 화주만 조회 가능
    AND (
      auth.role() = 'service_role'
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = p_agency_org_id
      OR EXISTS (
        SELECT 1 FROM public.zen_agency_shippers s
        WHERE s.agency_org_id = p_agency_org_id
          AND s.shipper_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
          AND s.is_active = TRUE
      )
    )
  ORDER BY valid_from DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_ups_agency_other_charge_price(
  p_agency_org_id UUID,
  p_other_charge_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT selling_price
  FROM public.zen_agency_other_charges
  WHERE agency_org_id = p_agency_org_id
    AND other_charge_id = p_other_charge_id
    AND is_active = TRUE
    AND (
      auth.role() = 'service_role'
      OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
      OR (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = p_agency_org_id
      OR EXISTS (
        SELECT 1 FROM public.zen_agency_shippers s
        WHERE s.agency_org_id = p_agency_org_id
          AND s.shipper_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
          AND s.is_active = TRUE
      )
    );
$$;

COMMENT ON FUNCTION public.fn_get_ups_agency_selling_price IS 'An-14 §3-3/설계상 보안이점 — 화주 세션이 Agency cost_price/discount_rate를 보지 않고 selling_price만 조회.';
