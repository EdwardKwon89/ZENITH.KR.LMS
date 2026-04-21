-- 1. 전역 시스템 설정 테이블 생성
CREATE TABLE IF NOT EXISTS zen_system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 역할별 권한 매핑 테이블 생성
CREATE TABLE IF NOT EXISTS zen_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code TEXT NOT NULL,
    menu_id TEXT NOT NULL,
    path TEXT NOT NULL,
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_code, path)
);

-- 3. 프로필 테이블 확장 (다국어 선호도)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='profiles' AND column_name='preferred_language') THEN
        ALTER TABLE profiles ADD COLUMN preferred_language TEXT DEFAULT 'ko';
    END IF;
END $$;

-- 4. 마스터 데이터 부트스트래핑: 시스템 설정
INSERT INTO zen_system_settings (setting_key, setting_value, description)
VALUES ('default_page_size', '20', '기본 오더 목록 노출 행 수')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 5. 마스터 데이터 부트스트래핑: 공통 코드 그룹 (USER_ROLE)
INSERT INTO common_code_groups (group_code, group_name, is_system, description)
VALUES ('USER_ROLE', '사용자 역할 권한', true, '시스템 8대 표준 역할')
ON CONFLICT (group_code) DO NOTHING;

-- 6. 마스터 데이터 부트스트래핑: 8대 역할 공통 코드
-- (group_id를 찾아서 매핑해야 하므로 group_code 기반으로 별도 처리 권장되나, 현재는 code 테이블의 group_code 필드를 활용)
INSERT INTO common_codes (group_code, code_value, code_name_ko, code_name_en, sort_order, is_active)
VALUES 
('USER_ROLE', 'ZENITH_SUPER_ADMIN', '전역 어드민', 'Super Admin', 1, true),
('USER_ROLE', 'ADMIN', '조직 관리자', 'Admin', 2, true),
('USER_ROLE', 'MANAGER', '운영 매니저', 'Manager', 3, true),
('USER_ROLE', 'OPERATOR', '물류 운영자', 'Operator', 4, true),
('USER_ROLE', 'CARRIER', '운송 파트너', 'Carrier', 5, true),
('USER_ROLE', 'CORPORATE', '법인 화주', 'Corporate', 6, true),
('USER_ROLE', 'INDIVIDUAL', '개인 화주', 'Individual', 7, true),
('USER_ROLE', 'USER', '일반 사용자', 'User', 8, true)
ON CONFLICT (group_code, code_value) DO NOTHING;
;
