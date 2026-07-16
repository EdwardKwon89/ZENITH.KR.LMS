-- Issue #528: UPS base_rates/weight_tier_rates/freight_minimums RLS 정책에 SHIPPER/AGENCY_SHIPPER 역할 추가
-- Mike (Team B) TASK-B-139

-- 3개 테이블 모두 zen_profiles.role 기반 RLS 사용
-- 기존: role IN ('CORPORATE','INDIVIDUAL') → 신규: role IN ('CORPORATE','INDIVIDUAL','SHIPPER','AGENCY_SHIPPER')

-- §1 — zen_ups_base_rates
DROP POLICY IF EXISTS "ups_base_rates_shipper_select" ON public.zen_ups_base_rates;
CREATE POLICY "ups_base_rates_shipper_select"
  ON public.zen_ups_base_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('CORPORATE','INDIVIDUAL','SHIPPER','AGENCY_SHIPPER')
    )
  );

-- §2 — zen_ups_weight_tier_rates
DROP POLICY IF EXISTS "ups_weight_tier_rates_shipper_select" ON public.zen_ups_weight_tier_rates;
CREATE POLICY "ups_weight_tier_rates_shipper_select"
  ON public.zen_ups_weight_tier_rates FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('CORPORATE','INDIVIDUAL','SHIPPER','AGENCY_SHIPPER')
    )
  );

-- §3 — zen_ups_freight_minimums
DROP POLICY IF EXISTS "ups_freight_minimums_shipper_select" ON public.zen_ups_freight_minimums;
CREATE POLICY "ups_freight_minimums_shipper_select"
  ON public.zen_ups_freight_minimums FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('CORPORATE','INDIVIDUAL','SHIPPER','AGENCY_SHIPPER')
    )
  );
