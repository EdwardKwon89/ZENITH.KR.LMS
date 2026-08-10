-- Migration: public.zen_ups_actual_cost 테이블 생성 (Issue #1009)
-- Description: UPS 사후 원가 확정 — 실제 청구서(HKD) 기반 부피/중량/기본운임/유류할증/급증긴급수수료 + RELEASED일 환율 스냅샷 원가
-- 기존 zen_ups_actual_charges(매출측 추가청구)와 독립 — 오더당 1행(UNIQUE)

BEGIN;

CREATE TABLE IF NOT EXISTS public.zen_ups_actual_cost (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL UNIQUE REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  ups_invoice_no       text,
  ups_invoice_date     date,
  actual_weight_kg     numeric(10,2),
  actual_length_cm     numeric(8,2),
  actual_width_cm      numeric(8,2),
  actual_height_cm     numeric(8,2),
  base_freight_hkd     numeric(14,2) NOT NULL DEFAULT 0,
  fuel_surcharge_hkd   numeric(14,2) NOT NULL DEFAULT 0,
  surge_fee_hkd        numeric(14,2) NOT NULL DEFAULT 0,
  other_charges_hkd    numeric(14,2) NOT NULL DEFAULT 0,
  applied_exchange_rate numeric(18,6),
  total_cost_krw       numeric(14,2),
  entered_by           uuid REFERENCES public.zen_profiles(id),
  entered_at           timestamptz NOT NULL DEFAULT now(),
  notes                text
);

ALTER TABLE public.zen_ups_actual_cost ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.zen_ups_actual_cost TO postgres, service_role, authenticated;

DROP POLICY IF EXISTS admin_manager_all ON public.zen_ups_actual_cost;
CREATE POLICY admin_manager_all ON public.zen_ups_actual_cost
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

DROP POLICY IF EXISTS shipper_agency_select ON public.zen_ups_actual_cost;
CREATE POLICY shipper_agency_select ON public.zen_ups_actual_cost
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      JOIN public.zen_profiles p ON p.id = auth.uid()
      WHERE o.id = zen_ups_actual_cost.order_id
        AND (
          o.shipper_id = p.org_id
          OR o.agency_org_id = p.org_id
        )
    )
  );

COMMIT;
