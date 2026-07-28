-- TASK-214 / IMP-153: supabase db reset 시 authenticated 롤 SELECT GRANT 누락 근본 해결
-- Issue #790
--
-- 배경:
--   이 프로젝트는 테이블별 개별 GRANT를 마이그레이션에 포함하지 않는 관례였음.
--   로컬 개발 DB는 오랜 기간 누적 GRANT로 인해 정상 동작했으나,
--   CI의 `supabase db reset`은 마이그레이션만 순서대로 재생하므로
--   GRANT가 누락된 테이블에서 "permission denied" 에러 발생.
--   지금까지 DEF-071/072/074/096/B-003 등으로 개별 땜질해왔으나
--   근본 해결이 안 됨 — 신규 테이블마다 반복 발생.
--
-- 조치:
--   1) ALTER DEFAULT PRIVILEGES: 앞으로 생성될 신규 테이블에 자동 SELECT 부여
--   2) GRANT ON ALL TABLES: 기존 테이블에 소급 적용
--   3) anon 롤은 현재 코드베이스에서 직접 쿼리하는 경로가 없으므로 제외
--
-- 참고: 20260622000000_fix_service_role_grants.sql 패턴 참조

-- ============================================================
-- 1. 향후 신규 테이블 자동 적용 (ALTER DEFAULT PRIVILEGES)
-- ============================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO authenticated;

-- ============================================================
-- 2. 기존 테이블 소급 적용 (GRANT ON ALL TABLES)
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- ============================================================
-- 3. 확인 쿼리 (dry-run — CI 로그에서 검증용)
-- ============================================================
-- SELECT grantee, table_name
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'authenticated'
--   AND table_schema = 'public'
-- ORDER BY table_name;