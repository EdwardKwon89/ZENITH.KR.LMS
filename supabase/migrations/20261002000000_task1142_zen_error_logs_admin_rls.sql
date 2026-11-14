-- TASK-1142 (Issue #1211, DEF-137): zen_error_logs Admin RLS 복구
--
-- 배경: 20260429100000이 만든 "Admin full access on zen_error_logs" 정책은
-- USING 절에서 profiles 테이블을 참조했는데, 20260521200000(imp049) M6의
-- `DROP TABLE IF EXISTS public.profiles CASCADE`가 이 정책을 함께 삭제했다.
-- 이후 RLS default-deny로 authenticated SELECT/UPDATE가 전면 차단되어
-- /admin/error-logs 화면이 admin 세션에서 0건을 반환 (DEF-137).
--
-- 조치: 20260507110000_fix_rls_recursion.sql 선례와 동일한
-- (auth.jwt() -> 'app_metadata' ->> 'role') 체크 방식으로 정책을 재생성한다.
-- 테이블 조회를 포함하지 않으므로 profiles 뷰/재귀 문제와 무관하다.
-- 추가로 authenticated에 SELECT/INSERT/UPDATE GRANT를 부여한다
-- (현재 authenticated 롤에 본 테이블 GRANT가 전혀 없어, 정책만 복구해서는
-- PostgREST 경로가 여전히 permission-denied가 된다. def117 선례와 동일).
-- DELETE GRANT는 의도적으로 제외한다 — 삭제 UI/API가 없으므로 최소권한 유지.

BEGIN;

DROP POLICY IF EXISTS "Admin full access on zen_error_logs"
  ON public.zen_error_logs;

CREATE POLICY "Admin full access on zen_error_logs"
  ON public.zen_error_logs
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
  );

GRANT SELECT, INSERT, UPDATE ON public.zen_error_logs TO authenticated;

COMMIT;
