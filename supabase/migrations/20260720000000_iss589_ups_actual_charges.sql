-- Migration: public.zen_ups_actual_charges 테이블 생성
-- Description: UPS 실제 청구 항목 저장 및 RLS 정책 적용

BEGIN;

CREATE TABLE IF NOT EXISTS public.zen_ups_actual_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  ups_invoice_no text,
  charge_type text NOT NULL,              -- 'BASE'/'FUEL'/'RESIDENTIAL'/'ADDRESS_CORRECTION'/'DAS'/'PEAK_SEASON'/'OTHER' 등
  charge_amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  ups_invoice_date date,
  entered_by uuid REFERENCES public.zen_profiles(id),
  entered_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- RLS 활성화
ALTER TABLE public.zen_ups_actual_charges ENABLE ROW LEVEL SECURITY;

-- 권한 부여
GRANT ALL ON public.zen_ups_actual_charges TO postgres, service_role, authenticated;

-- RLS 정책 설정
DROP POLICY IF EXISTS admin_manager_all ON public.zen_ups_actual_charges;
CREATE POLICY admin_manager_all ON public.zen_ups_actual_charges
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'MANAGER')
    )
  );

DROP POLICY IF EXISTS shipper_agency_select ON public.zen_ups_actual_charges;
CREATE POLICY shipper_agency_select ON public.zen_ups_actual_charges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      JOIN public.zen_profiles p ON p.id = auth.uid()
      WHERE o.id = zen_ups_actual_charges.order_id
        AND (
          o.shipper_id = p.org_id
          OR o.agency_org_id = p.org_id
        )
    )
  );

COMMIT;
