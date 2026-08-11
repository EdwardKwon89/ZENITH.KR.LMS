-- Issue #1018: UPS 할인율에 DOC/NONDOC 축 추가 (Express/Saver 한정)
-- TASK-B-262. JSJung 요구사항: Express/Saver에 한해 DOC/NONDOC별로도 별도 할인율 등록 가능

-- §1 — zen_agency_pricing_policies에 cargo_type 컬럼 추가
ALTER TABLE public.zen_agency_pricing_policies
  ADD COLUMN IF NOT EXISTS cargo_type text NOT NULL DEFAULT 'ALL'
    CHECK (cargo_type IN ('DOC','NON_DOC','ALL'));

-- 기존 UNIQUE 제약 제거 및 새 UNIQUE 제약 추가
ALTER TABLE public.zen_agency_pricing_policies
  DROP CONSTRAINT IF EXISTS uq_agency_org_zone;

ALTER TABLE public.zen_agency_pricing_policies
  ADD CONSTRAINT uq_agency_org_zone_cargo UNIQUE (agency_org_id, zone_id, cargo_type);

COMMENT ON COLUMN public.zen_agency_pricing_policies.cargo_type IS '화물 유형별 할인율 구분 (Issue #1018). ALL: 전체 적용(기본값), DOC: 서류 한정, NON_DOC: 비서류 한정.';

-- §2 — zen_agency_shipper_zone_discounts에 cargo_type 컬럼 추가
ALTER TABLE public.zen_agency_shipper_zone_discounts
  ADD COLUMN IF NOT EXISTS cargo_type text NOT NULL DEFAULT 'ALL'
    CHECK (cargo_type IN ('DOC','NON_DOC','ALL'));

-- 기존 UNIQUE 제약 제거 및 새 UNIQUE 제약 추가
ALTER TABLE public.zen_agency_shipper_zone_discounts
  DROP CONSTRAINT IF EXISTS zen_agency_shipper_zone_disco_agency_org_id_shipper_org_id__key;

ALTER TABLE public.zen_agency_shipper_zone_discounts
  ADD CONSTRAINT uq_agency_shipper_zone_cargo UNIQUE (agency_org_id, shipper_org_id, zone_id, cargo_type);

COMMENT ON COLUMN public.zen_agency_shipper_zone_discounts.cargo_type IS '화물 유형별 할인율 구분 (Issue #1018). ALL: 전체 적용(기본값), DOC: 서류 한정, NON_DOC: 비서류 한정.';

-- §3 — 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_agency_pricing_policies_cargo ON public.zen_agency_pricing_policies(agency_org_id, cargo_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shipper_zone_discounts_cargo ON public.zen_agency_shipper_zone_discounts(agency_org_id, shipper_org_id, cargo_type) WHERE is_active = TRUE;
