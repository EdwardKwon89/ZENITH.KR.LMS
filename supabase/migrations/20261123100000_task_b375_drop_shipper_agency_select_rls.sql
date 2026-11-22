-- TASK-B-375 (Issue #1356, DEF-150 후속): UPS 실비 테이블 화주·대리점 SELECT RLS 제거
-- JSJung 확정(2026-11-22): zen_ups_actual_charges는 ZENITH_SUPER_ADMIN·ADMIN·MANAGER 전용.
-- 앱 가드·admin client 전환은 PR #1440(TASK-B-372)에서 완료. 이 마이그레이션은 DB 정책만 제거한다.
-- 대체 정책 없음. 관리자 정책(admin_manager_all)은 유지한다.
-- 롤백: 20260720000000_iss589_ups_actual_charges.sql의 shipper_agency_select 정책 재생성.

BEGIN;

DROP POLICY IF EXISTS shipper_agency_select ON public.zen_ups_actual_charges;

COMMIT;

NOTIFY pgrst, 'reload schema';
