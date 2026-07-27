-- Issue #491: UPS 급증 긴급 수수료(Surge Emergency Fee) — 도착국×적용기간별 kg당 단가 매트릭스
-- 출발지는 한국 고정(ZENITH는 한국 발송 전용 플랫폼)이므로 출발지 컬럼 없음.
-- 유류할증료 부과 대상 항목(SNTL 자료·UPS 공식 PDF 확인) — fuel_surcharge_applicable 상시 TRUE.

CREATE TABLE public.zen_ups_surge_fees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_country_code VARCHAR(3) NOT NULL,  -- ISO 3166-1 alpha-3, zen_ups_zone_countries.country_code와 동일 규격
  selling_rate_per_kg   NUMERIC(18,2) NOT NULL CHECK (selling_rate_per_kg >= 0),
  cost_rate_per_kg      NUMERIC(18,2) NOT NULL CHECK (cost_rate_per_kg >= 0),
  currency              VARCHAR(3) NOT NULL DEFAULT 'KRW',
  effective_from        DATE NOT NULL,
  effective_until       DATE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES public.zen_profiles(id),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

COMMENT ON TABLE public.zen_ups_surge_fees IS 'UPS 급증 긴급 수수료(Surge Emergency Fee) — 도착국별 kg당 단가, 적용기간별 관리 (Issue #491)';
COMMENT ON COLUMN public.zen_ups_surge_fees.destination_country_code IS 'ISO 3166-1 alpha-3 도착국 코드';
COMMENT ON COLUMN public.zen_ups_surge_fees.selling_rate_per_kg IS '판매가 kg당 단가 (currency 기준)';
COMMENT ON COLUMN public.zen_ups_surge_fees.cost_rate_per_kg IS '원가 kg당 단가 (currency 기준)';
COMMENT ON COLUMN public.zen_ups_surge_fees.effective_from IS '적용 시작일 (UPS 공지 기준)';
COMMENT ON COLUMN public.zen_ups_surge_fees.effective_until IS '적용 종료일. NULL이면 다음 공지 전까지 무기한';

CREATE INDEX idx_ups_surge_fees_lookup
  ON public.zen_ups_surge_fees(destination_country_code, effective_from DESC)
  WHERE is_active = TRUE;

ALTER TABLE public.zen_ups_surge_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ups_surge_fees_admin_all"
  ON public.zen_ups_surge_fees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_surge_fees_authenticated_select"
  ON public.zen_ups_surge_fees FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

GRANT ALL ON TABLE public.zen_ups_surge_fees TO service_role;
GRANT ALL ON TABLE public.zen_ups_surge_fees TO authenticated;
