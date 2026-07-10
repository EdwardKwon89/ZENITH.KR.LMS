-- Issue #310: UPS Zone별 할인율 전환 — rate_overrides 폐기 + shipper zone discounts
-- JSJung 설계 확정 (2026-07-10)

-- §1 — zen_agency_pricing_policies: UNIQUE(agency_org_id) → UNIQUE(agency_org_id, zone_id)
ALTER TABLE public.zen_agency_pricing_policies
  DROP CONSTRAINT IF EXISTS zen_agency_pricing_policies_agency_org_id_key;

ALTER TABLE public.zen_agency_pricing_policies
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE;

-- 기존 단일 할인율 → 모든 Zone에 동일 할인율로 복제
INSERT INTO public.zen_agency_pricing_policies (agency_org_id, zone_id, discount_rate, is_active, created_at, updated_at, updated_by)
SELECT p.agency_org_id, z.id, p.discount_rate, p.is_active, p.created_at, p.updated_at, p.updated_by
FROM public.zen_agency_pricing_policies p
CROSS JOIN public.zen_ups_zones z
WHERE z.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.zen_agency_pricing_policies existing
    WHERE existing.agency_org_id = p.agency_org_id
      AND existing.zone_id = z.id
  );

-- UNIQUE 제약 재설정
DELETE FROM public.zen_agency_pricing_policies a
WHERE a.zone_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.zen_agency_pricing_policies b
    WHERE b.agency_org_id = a.agency_org_id
      AND b.zone_id IS NOT NULL
  );

ALTER TABLE public.zen_agency_pricing_policies
  ALTER COLUMN zone_id SET NOT NULL;

ALTER TABLE public.zen_agency_pricing_policies
  ADD CONSTRAINT uq_agency_org_zone UNIQUE (agency_org_id, zone_id);

COMMENT ON COLUMN public.zen_agency_pricing_policies.zone_id IS 'Zone 단위 할인율 (Issue #310). UNIQUE(agency_org_id, zone_id) 적용.';

-- §2 — zen_agency_shipper_zone_discounts 신규 (화주별 Zone 할인율)
CREATE TABLE IF NOT EXISTS public.zen_agency_shipper_zone_discounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
  shipper_org_id  UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
  zone_id         UUID NOT NULL REFERENCES public.zen_ups_zones(id) ON DELETE CASCADE,
  discount_rate   NUMERIC(5,4) NOT NULL CHECK (discount_rate >= 0 AND discount_rate < 1),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public.zen_profiles(id),
  UNIQUE(agency_org_id, shipper_org_id, zone_id)
);

COMMENT ON TABLE public.zen_agency_shipper_zone_discounts IS '화주별 Zone 할인율 (Issue #310). Agency가 화주 등록 시 설정.';
COMMENT ON COLUMN public.zen_agency_shipper_zone_discounts.discount_rate IS '해당 화주의 Zone별 할인율. Admin 판매가에 직접 적용 (Agency 원가 경유 안 함).';

ALTER TABLE public.zen_agency_shipper_zone_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipper_zone_discounts_admin_all" ON public.zen_agency_shipper_zone_discounts
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

CREATE POLICY "shipper_zone_discounts_agency_all" ON public.zen_agency_shipper_zone_discounts
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

CREATE INDEX idx_shipper_zone_discounts_agency ON public.zen_agency_shipper_zone_discounts(agency_org_id) WHERE is_active = TRUE;
CREATE INDEX idx_shipper_zone_discounts_shipper ON public.zen_agency_shipper_zone_discounts(shipper_org_id) WHERE is_active = TRUE;

-- 기존 shipper 할인율을 모든 Zone에 복제
INSERT INTO public.zen_agency_shipper_zone_discounts (agency_org_id, shipper_org_id, zone_id, discount_rate, is_active, created_at)
SELECT s.agency_org_id, s.shipper_org_id, z.id, s.discount_rate, s.is_active, NOW()
FROM public.zen_agency_shippers s
CROSS JOIN public.zen_ups_zones z
WHERE z.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.zen_agency_shipper_zone_discounts existing
    WHERE existing.agency_org_id = s.agency_org_id
      AND existing.shipper_org_id = s.shipper_org_id
      AND existing.zone_id = z.id
  );

-- §3 — zen_agency_rate_overrides 완전 폐기
DROP TRIGGER IF EXISTS trg_agency_rate_override_calc_cost ON public.zen_agency_rate_overrides;
DROP FUNCTION IF EXISTS public.trg_agency_rate_override_calc_cost();
DROP FUNCTION IF EXISTS public.fn_get_ups_agency_selling_price(UUID, UUID, DATE);
DROP TABLE IF EXISTS public.zen_agency_rate_overrides;

-- §4 — service_role GRANT for new table
GRANT ALL ON TABLE public.zen_agency_shipper_zone_discounts TO service_role;
GRANT ALL ON TABLE public.zen_agency_shipper_zone_discounts TO authenticated;
