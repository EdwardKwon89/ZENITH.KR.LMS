-- TASK-B-123 / Issue #486: AGENCY 역할에 창고 입고/출고 처리 권한 부여
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
  ('AGENCY', 'warehouse', '/warehouse', true)
ON CONFLICT (role_code, path) DO NOTHING;
