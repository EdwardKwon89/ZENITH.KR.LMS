-- DEF-B-003: zen_agency_shippers authenticated GRANT 추가
-- CI fresh reset 환경에서 AGENCY RLS 테스트 FAIL 방지
-- Related: Issue #847, TASK-B-206

GRANT SELECT ON public.zen_agency_shippers TO authenticated;
