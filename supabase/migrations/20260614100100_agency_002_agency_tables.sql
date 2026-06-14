-- 20260614100100_agency_002_agency_tables.sql
-- [P7-SPR-01] Agency 역할 모델 — 대리점 화주 계층 + 요율 오버라이드 테이블 신설
-- Team B (JSJung / Jaison) | TASK-139 | IMP-111

-- §1 — zen_agency_shippers: 대리점 하위 화주 연결
CREATE TABLE IF NOT EXISTS public.zen_agency_shippers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL REFERENCES zen_organizations(id) ON DELETE CASCADE,
  shipper_org_id  UUID NOT NULL REFERENCES zen_organizations(id) ON DELETE CASCADE,
  shipper_type    VARCHAR(10) NOT NULL CHECK (shipper_type IN ('INDIVIDUAL', 'CORPORATE')),
  discount_rate   NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate < 1),
  grade           VARCHAR(20),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_org_id, shipper_org_id)
);

ALTER TABLE public.zen_agency_shippers ENABLE ROW LEVEL SECURITY;

-- ADMIN/MANAGER: 전체 접근
CREATE POLICY "agency_shippers_admin_all" ON public.zen_agency_shippers
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

-- AGENCY: 본인 agency_org_id 항목만 조회/수정
CREATE POLICY "agency_shippers_agency_own" ON public.zen_agency_shippers
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

-- CORPORATE/INDIVIDUAL: 본인 shipper_org_id 조회만
CREATE POLICY "agency_shippers_shipper_select" ON public.zen_agency_shippers
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('CORPORATE', 'INDIVIDUAL')
    AND shipper_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );

-- §2 — zen_agency_rate_overrides: 대리점 자체 요율 오버라이드
CREATE TABLE IF NOT EXISTS public.zen_agency_rate_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_org_id   UUID NOT NULL REFERENCES zen_organizations(id) ON DELETE CASCADE,
  base_rate_id    UUID NOT NULL REFERENCES zen_ups_base_rates(id) ON DELETE CASCADE,
  selling_price   NUMERIC(18,2) NOT NULL CHECK (selling_price >= 0),
  cost_price      NUMERIC(18,2) NOT NULL CHECK (cost_price >= 0),
  valid_from      DATE NOT NULL,
  valid_until     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES zen_profiles(id),
  UNIQUE(agency_org_id, base_rate_id, valid_from)
);

ALTER TABLE public.zen_agency_rate_overrides ENABLE ROW LEVEL SECURITY;

-- ADMIN/MANAGER: 전체 접근
CREATE POLICY "agency_rate_overrides_admin_all" ON public.zen_agency_rate_overrides
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN'));

-- AGENCY: 본인 agency_org_id 항목만 CRUD
CREATE POLICY "agency_rate_overrides_agency_own" ON public.zen_agency_rate_overrides
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'AGENCY'
    AND agency_org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
  );
