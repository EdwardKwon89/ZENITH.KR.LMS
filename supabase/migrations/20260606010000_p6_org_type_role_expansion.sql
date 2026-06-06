-- 20260606010000_p6_org_type_role_expansion.sql
-- [P6-SPR-01] org_type 확장 + CUSTOMS_BROKER, DELIVERY_AGENT 역할 추가
-- Phase 6: 신규 서비스 역할 모델 + 멀티 서비스 배정 구조 (v1.5.0)

-- §1 — zen_organizations.type CHECK constraint 확장 (CUSTOMS, DELIVERY 추가)
ALTER TABLE public.zen_organizations
DROP CONSTRAINT IF EXISTS zen_organizations_type_check;

ALTER TABLE public.zen_organizations
ADD CONSTRAINT zen_organizations_type_check
CHECK (type IN ('PLATFORM', 'CARRIER', 'SHIPPER', 'CORPORATE', 'INDIVIDUAL', 'CUSTOMS', 'DELIVERY'));

-- §2 — zen_role_permissions에 CUSTOMS_BROKER, DELIVERY_AGENT 행 추가
INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('CUSTOMS_BROKER', 'customs-rates', '/admin/customs-rates', true),
('CUSTOMS_BROKER', 'assigned', '/orders/assigned', true),
('CUSTOMS_BROKER', 'tracking', '/tracking', true),
('CUSTOMS_BROKER', 'voc', '/voc', true),
('CUSTOMS_BROKER', 'mypage', '/mypage', true)
ON CONFLICT (role_code, path) DO NOTHING;

INSERT INTO zen_role_permissions (role_code, menu_id, path, is_allowed) VALUES
('DELIVERY_AGENT', 'delivery-rates', '/admin/delivery-rates', true),
('DELIVERY_AGENT', 'assigned', '/orders/assigned', true),
('DELIVERY_AGENT', 'tracking', '/tracking', true),
('DELIVERY_AGENT', 'voc', '/voc', true),
('DELIVERY_AGENT', 'mypage', '/mypage', true)
ON CONFLICT (role_code, path) DO NOTHING;
