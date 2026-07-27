-- Issue #664: zen_shxk_api_logs RLS 정책 확대
-- 1) SELECT: 전체 인증 사용자로 확대
-- 2) INSERT: AGENCY 역할 명시 허용 (기존 GRANT는 authenticated 대상이나
--    admin_all_zen_shxk_api_logs의 USING 절이 WITH CHECK 역할도 하여 차단됨)

-- 1. SELECT 정책: 전체 인증 사용자 조회 허용
CREATE POLICY "authenticated_select_zen_shxk_api_logs" ON public.zen_shxk_api_logs
  FOR SELECT TO authenticated
  USING (true);

-- 2. INSERT 정책: AGENCY 역할 쓰기 허용
--    callShxk() 로깅 훅이 AGENCY 컨텍스트에서도 동작하도록
CREATE POLICY "agency_insert_zen_shxk_api_logs" ON public.zen_shxk_api_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'AGENCY');

COMMENT ON POLICY "authenticated_select_zen_shxk_api_logs" ON public.zen_shxk_api_logs IS 'Issue #664: 전체 인증 사용자 SELECT 허용 (PII 포함, JSJung 명시 지시)';
COMMENT ON POLICY "agency_insert_zen_shxk_api_logs" ON public.zen_shxk_api_logs IS 'Issue #664: AGENCY INSERT 허용 (callShxk 로깅 훅용)';
