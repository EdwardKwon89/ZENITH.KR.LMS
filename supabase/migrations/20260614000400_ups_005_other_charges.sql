-- Phase 7 UPS 특송: Other Charge 코드 테이블
-- TASK-138 IMP-110

-- 1. zen_ups_other_charges
CREATE TABLE public.zen_ups_other_charges (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_code               VARCHAR(20) NOT NULL UNIQUE,
  charge_name               TEXT NOT NULL,
  unit                      VARCHAR(20) NOT NULL,   -- 'PKG', 'KG', 'LOT' 등
  fuel_surcharge_applicable BOOLEAN DEFAULT FALSE,
  selling_price             NUMERIC(18,2) CHECK (selling_price >= 0),
  cost_price                NUMERIC(18,2) CHECK (cost_price >= 0),
  currency                  VARCHAR(3) DEFAULT 'KRW',
  is_active                 BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  created_by                UUID REFERENCES public.zen_profiles(id)
);

-- 2. RLS
ALTER TABLE public.zen_ups_other_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ups_other_charges_admin_all"
  ON public.zen_ups_other_charges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_other_charges_authenticated_select"
  ON public.zen_ups_other_charges FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- 3. 인덱스
CREATE INDEX idx_ups_other_charges_active ON public.zen_ups_other_charges(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ups_other_charges_code ON public.zen_ups_other_charges(charge_code);
