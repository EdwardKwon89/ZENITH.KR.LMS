-- [AUDIT-S2-A] zen_role_permissions 초기 데이터 시딩
-- STATIC_PERMISSIONS 기반으로 초기 권한 정보를 삽입합니다.

-- 기존 데이터가 있다면 중복 방지를 위해 삭제 (관리자용 데이터는 남겨둘 수도 있으나, 여기서는 초기화 기준)
DELETE FROM zen_role_permissions;

-- 1. ADMIN
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('ADMIN', 'master', '/master', true),
('ADMIN', 'admin', '/admin', true),
('ADMIN', 'orders', '/orders', true),
('ADMIN', 'logistics', '/logistics', true),
('ADMIN', 'billing', '/billing', true),
('ADMIN', 'tracking', '/tracking', true),
('ADMIN', 'inventory', '/inventory', true),
('ADMIN', 'finance', '/finance', true),
('ADMIN', 'settlement', '/settlement', true),
('ADMIN', 'voc', '/voc', true),
('ADMIN', 'support', '/support', true),
('ADMIN', 'mypage', '/mypage', true),
('ADMIN', 'permissions', '/admin/permissions', true);

-- 2. MANAGER
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('MANAGER', 'orders', '/orders', true),
('MANAGER', 'logistics', '/logistics', true),
('MANAGER', 'billing', '/billing', true),
('MANAGER', 'reports', '/reports', true),
('MANAGER', 'tracking', '/tracking', true),
('MANAGER', 'inventory', '/inventory', true),
('MANAGER', 'finance', '/finance', true),
('MANAGER', 'settlement', '/settlement', true),
('MANAGER', 'voc', '/voc', true),
('MANAGER', 'support', '/support', true),
('MANAGER', 'mypage', '/mypage', true);

-- 3. OPERATOR
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('OPERATOR', 'orders', '/orders', true),
('OPERATOR', 'logistics', '/logistics', true),
('OPERATOR', 'tracking', '/tracking', true),
('OPERATOR', 'voc', '/voc', true),
('OPERATOR', 'support', '/support', true),
('OPERATOR', 'mypage', '/mypage', true);

-- 4. CARRIER
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('CARRIER', 'delivery', '/logistics/delivery', true),
('CARRIER', 'assigned', '/orders/assigned', true),
('CARRIER', 'transport-costs', '/admin/transport-costs', true),
('CARRIER', 'rates', '/admin/rates', true),
('CARRIER', 'voc', '/voc', true),
('CARRIER', 'support', '/support', true),
('CARRIER', 'mypage', '/mypage', true);

-- 5. CORPORATE
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('CORPORATE', 'orders', '/orders', true),
('CORPORATE', 'invoice', '/billing/invoice', true),
('CORPORATE', 'tracking', '/tracking', true),
('CORPORATE', 'finance', '/finance', true),
('CORPORATE', 'settlement', '/settlement', true),
('CORPORATE', 'voc', '/voc', true),
('CORPORATE', 'support', '/support', true),
('CORPORATE', 'mypage', '/mypage', true);

-- 6. INDIVIDUAL
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('INDIVIDUAL', 'orders', '/orders', true),
('INDIVIDUAL', 'tracking', '/tracking', true),
('INDIVIDUAL', 'voc', '/voc', true),
('INDIVIDUAL', 'support', '/support', true),
('INDIVIDUAL', 'mypage', '/mypage', true);

-- 7. USER
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('USER', 'dashboard', '/dashboard', true),
('USER', 'mypage', '/mypage', true),
('USER', 'support', '/support', true);
