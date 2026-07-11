-- Fix: AGENCY 역할의 stale zen_role_permissions cleanup
-- Issue #321-2: AGENCY 역할에 stale '/ups-rates' row 1건만 존재하여
-- getPermissionsByRole()가 DB row만 반환, static fallback 미사용.
-- 결과: AGENCY 역할이 /agency, /agency/ups-rates 등 전체 메뉴 접근 불가.
-- 해결: stale row 삭제 → DB 0건 → static fallback 사용.

DELETE FROM zen_role_permissions
WHERE role_code = 'AGENCY'
  AND path = '/ups-rates'
  AND is_allowed = true;
