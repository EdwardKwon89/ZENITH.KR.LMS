-- Issue #999 / TASK-B-257: 일자별 환율 관리 테이블 신설
-- 설계 확정(2026-08-09, JSJung): ①정기 자동 수집(한국수출입은행 API) ②일자별 환율 관리
-- 기존 zen_system_params.EXCHANGE_RATE_USD_KRW(1350 고정)를 즉시 제거하지 않고
-- 신규 테이블에 값이 없는 극단 케이스의 최후 fallback으로만 당분간 유지(하위 호환).

CREATE TABLE public.zen_exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   VARCHAR(3) NOT NULL,                            -- 'USD'
  quote_currency  VARCHAR(3) NOT NULL,                            -- 'KRW'
  rate            NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  rate_date       DATE NOT NULL,                                  -- 해당 환율의 기준 영업일
  source          VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('KOREAEXIM_API','MANUAL')),
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.zen_profiles(id),        -- MANUAL인 경우만
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, rate_date)
);

-- 조회 성능: 통화쌍 + 일자 인덱스 (rate_date <= :date 최근값 조회)
CREATE INDEX idx_exchange_rates_pair_date
  ON public.zen_exchange_rates(base_currency, quote_currency, rate_date DESC);

-- RLS (ups-zones 패턴 준수)
ALTER TABLE public.zen_exchange_rates ENABLE ROW LEVEL SECURITY;

-- ADMIN/MANAGER/ZENITH_SUPER_ADMIN: 전체 (수동 보정 입력 포함)
CREATE POLICY "exchange_rates_admin_all"
  ON public.zen_exchange_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

-- 인증 사용자: 조회 허용 (견적/정산 화면에서 참조)
CREATE POLICY "exchange_rates_authenticated_select"
  ON public.zen_exchange_rates FOR SELECT
  TO authenticated
  USING (TRUE);

-- GRANT: authenticated SELECT (RLS 정책 대응)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
      AND table_name = 'zen_exchange_rates'
      AND privilege_type = 'SELECT'
  ) THEN
    GRANT SELECT ON public.zen_exchange_rates TO authenticated;
  END IF;
END $$;
