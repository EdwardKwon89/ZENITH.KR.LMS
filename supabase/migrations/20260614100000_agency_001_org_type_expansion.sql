-- 20260614100000_agency_001_org_type_expansion.sql
-- [P7-SPR-01] Agency 역할 모델 — org_type 확장 + AGENCY 권한 경로 등록
-- Team B (JSJung / Jaison) | TASK-139 | IMP-111

-- §1 — zen_organizations.type CHECK constraint 확장 (AGENCY 추가)
ALTER TABLE public.zen_organizations
DROP CONSTRAINT IF EXISTS zen_organizations_type_check;

ALTER TABLE public.zen_organizations
ADD CONSTRAINT zen_organizations_type_check
CHECK (type IN ('PLATFORM', 'CARRIER', 'SHIPPER', 'CORPORATE', 'INDIVIDUAL', 'CUSTOMS', 'DELIVERY', 'AGENCY'));

-- §2 — zen_role_permissions에 AGENCY 행 추가
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('AGENCY', 'orders',      '/orders',      true),
('AGENCY', 'ups-rates',   '/ups-rates',   true),
('AGENCY', 'agency',      '/agency',      true),
('AGENCY', 'tracking',    '/tracking',    true),
('AGENCY', 'settlement',  '/settlement',  true),
('AGENCY', 'voc',         '/voc',         true),
('AGENCY', 'mypage',      '/mypage',      true)
ON CONFLICT (role_code, path) DO NOTHING;
