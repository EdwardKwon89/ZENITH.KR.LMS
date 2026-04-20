
-- 1. 관리자(governance_master) 메타데이터 정정
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('status', 'ACTIVE', 'org_type', 'PLATFORM')
WHERE email = 'governance_master@zenith.kr';

-- 2. 테스트 유저(test_corp_001) 메타데이터 정정
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('status', 'PENDING', 'org_type', 'SHIPPER')
WHERE email = 'test_corp_001@zenith.kr';
