-- Issue #917: zen_invoices에 billed_org_id / invoice_tier 컬럼 추가
-- 2단계 인보이스 체계 마이그레이션 — Admin→Agency / Agency→Shipper / Admin→Shipper 분리
-- Related: Issue #916

-- 1. 컬럼 추가
ALTER TABLE public.zen_invoices
  ADD COLUMN IF NOT EXISTS billed_org_id UUID REFERENCES public.zen_organizations(id),
  ADD COLUMN IF NOT EXISTS invoice_tier TEXT CHECK (invoice_tier IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER'));

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_zen_invoices_billed_org ON public.zen_invoices(billed_org_id);
CREATE INDEX IF NOT EXISTS idx_zen_invoices_tier ON public.zen_invoices(invoice_tier);

-- 3. 백필: 기존 인보이스는 전부 shipper 대상 구조
--    source_order_id가 있고 agency_org_id가 있으면 AGENCY_TO_SHIPPER, 없으면 ADMIN_TO_SHIPPER
UPDATE public.zen_invoices inv
SET billed_org_id = inv.shipper_id,
    invoice_tier = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.zen_orders o
        WHERE o.id = (inv.metadata->>'source_order_id')::uuid
          AND o.agency_org_id IS NOT NULL
      ) THEN 'AGENCY_TO_SHIPPER'
      ELSE 'ADMIN_TO_SHIPPER'
    END
WHERE billed_org_id IS NULL;

-- 4. AGENCY SELECT RLS 정책 — billed_org_id가 본인 org_id인 인보이스 조회 허용
--    (다음 단계 "매입" 뷰의 기반)
DROP POLICY IF EXISTS "Agency can view billed invoices" ON public.zen_invoices;

CREATE POLICY "Agency can view billed invoices"
ON public.zen_invoices FOR SELECT
TO authenticated
USING (
  billed_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
);

-- 5. GRANT (AGENCY RLS의 billed_org_id 정책이 authenticated 롤에서 접근 가능하도록)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_grant
    WHERE grantee = 'authenticated'
      AND tablename = 'zen_invoices'
      AND privilege_type = 'SELECT'
  ) THEN
    GRANT SELECT ON public.zen_invoices TO authenticated;
  END IF;
END $$;
