-- ============================================================================
-- Seed: Test Fixture Data
-- 통합 테스트(tests/integration/)에서 필요한 고정 참조 데이터
-- 프로덕션 시드(seed_data.sql)와 분리하여 관리
-- ============================================================================

-- p6-transport-policy.test.ts (TC-POLICY-01~07)
INSERT INTO public.zen_organizations (name, type, status) VALUES
  ('Global Shipper Corp', 'SHIPPER', 'ACTIVE'),
  ('Fast Carrier Ltd',    'CARRIER', 'ACTIVE')
ON CONFLICT DO NOTHING;
