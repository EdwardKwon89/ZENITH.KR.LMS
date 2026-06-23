-- TASK-162 / DEF-074: zen_address_book service_role GRANT 누락 수정
-- DEF-071/072 동일 패턴 (참조: 20260622000000_fix_service_role_grants.sql)
-- Issue #81: /address-book 페이지 500 오류

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zen_address_book TO service_role;
