-- DEF-B-002: zen_invoices RLS에 AGENCY SELECT 커버리지 추가
-- agency@zenith.kr로 청구서 조회 시 빈 배열 반환 (침묵 실패)
-- DEF-114/116/117/120에 이은 AGENCY is_org_member 결함 5번째 재발
-- Related: Issue #831, TASK-B-205

-- GRANT: CI 환경에서 authenticated 롤에 테이블 접근 권한 부여
GRANT SELECT ON public.zen_invoices TO authenticated;

-- AGENCY SELECT 정책 추가
DROP POLICY IF EXISTS "Agency can view invoices for shipper orders" ON public.zen_invoices;

CREATE POLICY "Agency can view invoices for shipper orders"
ON public.zen_invoices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.zen_agency_shippers
    WHERE zen_agency_shippers.shipper_org_id = zen_invoices.shipper_id
      AND zen_agency_shippers.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
      AND zen_agency_shippers.is_active = true
  )
);
