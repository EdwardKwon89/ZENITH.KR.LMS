-- IMP-105: 운송수단별 요금 산정 정책 테이블 + tiers cbm_price 확장
--
-- 변경 내역:
--   1. zen_transport_pricing_policies 테이블 생성 + 시드 데이터
--   2. zen_rate_cards.tiers JSONB cbm_price 필드 지원 (기존 데이터 호환)
--   3. RLS: ADMIN 전용 쓰기, 전 역할 읽기

-- §1 — zen_transport_pricing_policies 테이블 생성
CREATE TABLE IF NOT EXISTS public.zen_transport_pricing_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_mode    TEXT NOT NULL UNIQUE CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  pricing_method    TEXT NOT NULL CHECK (pricing_method IN ('WEIGHT_ONLY','VOLUMETRIC','WM')),
  volumetric_divisor INTEGER,
  description       TEXT,
  is_active         BOOLEAN DEFAULT true,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        UUID REFERENCES public.zen_profiles(id)
);

COMMENT ON TABLE public.zen_transport_pricing_policies IS '운송수단별 요금 산정 정책 (Admin 전용 설정)';
COMMENT ON COLUMN public.zen_transport_pricing_policies.transport_mode IS '운송수단 (AIR/SEA/LAND/EXP)';
COMMENT ON COLUMN public.zen_transport_pricing_policies.pricing_method IS '산정 방식: WEIGHT_ONLY(중량단가), VOLUMETRIC(부피중량), WM(중량/용적 병산)';
COMMENT ON COLUMN public.zen_transport_pricing_policies.volumetric_divisor IS 'VOLUMETRIC 방식 전용 제수 (AIR=6000, EXP=5000)';

-- §1a — updated_at 트리거
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zen_transport_pricing_policies_updated_at ON public.zen_transport_pricing_policies;
CREATE TRIGGER trg_zen_transport_pricing_policies_updated_at
  BEFORE UPDATE ON public.zen_transport_pricing_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- §1b — 시드 데이터 (4행 고정)
INSERT INTO public.zen_transport_pricing_policies (transport_mode, pricing_method, volumetric_divisor, description)
VALUES
  ('AIR', 'VOLUMETRIC', 6000, 'IATA 항공 부피중량 기준 (L×W×H cm³ ÷ 6,000)'),
  ('EXP', 'VOLUMETRIC', 5000, '특송 부피중량 기준 (L×W×H cm³ ÷ 5,000)'),
  ('SEA', 'WM',        NULL, '해운 W/M 방식 (중량 vs 용적 병산 후 높은 쪽 채택)'),
  ('LAND', 'WM',       NULL, '육상 W/M 방식 (중량 vs 용적 병산 후 높은 쪽 채택)')
ON CONFLICT (transport_mode) DO NOTHING;

-- §2 — zen_rate_cards.tiers JSONB cbm_price 확장
-- 기존 tiers: { weight_min, unit_price, min_total_price }
-- 확장:      { weight_min, unit_price, cbm_price, min_total_price }
-- cbm_price는 WM 방식(SEA/LAND)에서 사용, AIR/EXP는 null 유지
-- CHECK 제약은 JSONB 내부 필드에 직접 적용 불가 → 애플리케이션 레벨 검증

COMMENT ON COLUMN public.zen_rate_cards.tiers IS '요율 등급: [{ weight_min, unit_price, cbm_price?, min_total_price? }] — cbm_price는 SEA/LAND WM 방식 전용';

-- §3 — RLS: ADMIN/SUPER_ADMIN만 INSERT/UPDATE/DELETE, 전 역할 SELECT
ALTER TABLE public.zen_transport_pricing_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY tpp_select_all ON public.zen_transport_pricing_policies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tpp_insert_admin ON public.zen_transport_pricing_policies
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'));

CREATE POLICY tpp_update_admin ON public.zen_transport_pricing_policies
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'));

CREATE POLICY tpp_delete_admin ON public.zen_transport_pricing_policies
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN'));
