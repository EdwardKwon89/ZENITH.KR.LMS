-- TASK-B-317 (Issue #1158, 3단계): zen_ups_actual_cost 스키마 확장 + 기타부가운임 자식 테이블
-- 1. 통화 자유선택 스키마 확장 (applied_exchange_rate를 currency와 함께 사용)
-- 2. 기타부가운임 자식 테이블 생성 (메인 테이블의 other_charges_hkd 대체)

BEGIN;

-- 1. zen_ups_actual_cost에 통화 관련 컬럼 추가
ALTER TABLE public.zen_ups_actual_cost
  ADD COLUMN IF NOT EXISTS base_freight_currency text NOT NULL DEFAULT 'HKD',
  ADD COLUMN IF NOT EXISTS fuel_surcharge_currency text NOT NULL DEFAULT 'HKD',
  ADD COLUMN IF NOT EXISTS surge_fee_currency text NOT NULL DEFAULT 'HKD';

COMMENT ON COLUMN public.zen_ups_actual_cost.base_freight_currency IS '기본운임 통화 (HKD/USD/KRW 등)';
COMMENT ON COLUMN public.zen_ups_actual_cost.fuel_surcharge_currency IS '유류할증료 통화';
COMMENT ON COLUMN public.zen_ups_actual_cost.surge_fee_currency IS '급증긴급수수료 통화';

-- 2. 기타부가운임 자식 테이블 생성
CREATE TABLE IF NOT EXISTS public.zen_ups_actual_other_charges (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL REFERENCES public.zen_ups_actual_cost(order_id) ON DELETE CASCADE,
  charge_name          text NOT NULL,
  amount               numeric(14,2) NOT NULL DEFAULT 0,
  currency             text NOT NULL DEFAULT 'HKD',
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.zen_ups_actual_other_charges IS 'TASK-B-317: UPS 사후 원가 기타부가운임 자식 테이블';
COMMENT ON COLUMN public.zen_ups_actual_other_charges.charge_name IS '부가운임명 (예: Customs Clearance Fee, Documentation Fee 등)';
COMMENT ON COLUMN public.zen_ups_actual_other_charges.amount IS '부가운임 금액';
COMMENT ON COLUMN public.zen_ups_actual_other_charges.currency IS '부가운임 통화';

-- 3. RLS 정책
ALTER TABLE public.zen_ups_actual_other_charges ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.zen_ups_actual_other_charges TO postgres, service_role, authenticated;

DROP POLICY IF EXISTS admin_manager_all_other_charges ON public.zen_ups_actual_other_charges;
CREATE POLICY admin_manager_all_other_charges ON public.zen_ups_actual_other_charges
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN', 'SUB_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN', 'SUB_ADMIN')
    )
  );

DROP POLICY IF EXISTS shipper_agency_select_other_charges ON public.zen_ups_actual_other_charges;
CREATE POLICY shipper_agency_select_other_charges ON public.zen_ups_actual_other_charges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_ups_actual_cost c
      JOIN public.zen_orders o ON o.id = c.order_id
      JOIN public.zen_profiles p ON p.id = auth.uid()
      WHERE c.id = zen_ups_actual_other_charges.order_id
        AND (
          o.shipper_id = p.org_id
          OR o.agency_org_id = p.org_id
        )
    )
  );

COMMIT;
