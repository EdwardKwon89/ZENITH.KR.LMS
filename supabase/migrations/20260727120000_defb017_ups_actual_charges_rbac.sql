INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
  ('MANAGER', 'ups_actual_charges', '/admin/ups-actual-charges', true),
  ('AGENCY', 'ups_actual_charges', '/admin/ups-actual-charges', true)
ON CONFLICT (role_code, path) DO NOTHING;
