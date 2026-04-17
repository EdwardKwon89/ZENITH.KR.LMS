-- 0. 공통 함수 및 트리거 (Common Functions & Triggers)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. 공통 코드 그룹 (common_code_groups)
CREATE TABLE IF NOT EXISTS public.common_code_groups (
    group_code VARCHAR(50) PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    is_system BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_code_group_updated_at BEFORE UPDATE ON public.common_code_groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. 공통 코드 상세 (common_codes)
CREATE TABLE IF NOT EXISTS public.common_codes (
    group_code VARCHAR(50) REFERENCES public.common_code_groups(group_code) ON DELETE CASCADE,
    code_value VARCHAR(50) NOT NULL,
    code_name_ko VARCHAR(100) NOT NULL,
    code_name_en VARCHAR(100),
    code_name_zh VARCHAR(100),
    code_name_ja VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_code, code_value)
);

CREATE TRIGGER set_code_updated_at BEFORE UPDATE ON public.common_codes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. 회원 등급 마스터 (grade_master)
CREATE TABLE IF NOT EXISTS public.grade_master (
    grade_code VARCHAR(20) PRIMARY KEY,
    grade_name_ko VARCHAR(100) NOT NULL,
    grade_name_en VARCHAR(100),
    grade_name_zh VARCHAR(100),
    grade_name_ja VARCHAR(100),
    discount_rate DECIMAL(5, 2) DEFAULT 0.00, -- 할인율 (%)
    benefit_desc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_grade_updated_at BEFORE UPDATE ON public.grade_master
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 초기 등급 데이터 삽입
INSERT INTO public.grade_master (grade_code, grade_name_ko, grade_name_en, grade_name_zh, grade_name_ja) VALUES
('FAMILY', '패밀리', 'Family', '家庭', 'ファミリー'),
('BRONZE', '브론즈', 'Bronze', '青铜', 'ブロンズ'),
('SILVER', '실버', 'Silver', '白银', 'シルバー'),
('GOLD', '골드', 'Gold', '黄金', 'ゴールド'),
('PLATINUM', '플래티넘', 'Platinum', '白金', 'プラチナ')
ON CONFLICT (grade_code) DO NOTHING;

-- 4. 국가 마스터 (nations)
CREATE TABLE IF NOT EXISTS public.nations (
    iso_alpha2 CHAR(2) PRIMARY KEY, -- KR, US, CN, JP 등
    iso_alpha3 CHAR(3) UNIQUE NOT NULL, -- KOR, USA, CHN, JPN 등
    nation_name_ko VARCHAR(100) NOT NULL,
    nation_name_en VARCHAR(100),
    nation_name_zh VARCHAR(100),
    nation_name_ja VARCHAR(100),
    phone_code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_nations_updated_at BEFORE UPDATE ON public.nations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. 항구/공항 마스터 (ports)
CREATE TABLE IF NOT EXISTS public.ports (
    port_code CHAR(5) PRIMARY KEY, -- IATA (ICN, LAX) 또는 UN-LOCODE (KRINC)
    nation_code CHAR(2) REFERENCES public.nations(iso_alpha2),
    port_name_ko VARCHAR(200) NOT NULL,
    port_name_en VARCHAR(200),
    port_name_zh VARCHAR(200),
    port_name_ja VARCHAR(200),
    port_type VARCHAR(10) NOT NULL, -- AIR, SEA
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_ports_updated_at BEFORE UPDATE ON public.ports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. 오더 상태 마스터 (order_status_master)
CREATE TABLE IF NOT EXISTS public.order_status_master (
    status_code VARCHAR(20) PRIMARY KEY,
    status_name_ko VARCHAR(100) NOT NULL,
    status_name_en VARCHAR(100),
    status_name_zh VARCHAR(100),
    status_name_ja VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_order_status_updated_at BEFORE UPDATE ON public.order_status_master
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. 조직 관리 (organizations) - 계층 구조 반영
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL, -- 계층 구조 (본사-지사)
    org_code VARCHAR(20) UNIQUE, -- 6자리 법인 ID 또는 고유 코드
    org_name_ko VARCHAR(200) NOT NULL,
    org_name_en VARCHAR(200),
    org_name_zh VARCHAR(200),
    org_name_ja VARCHAR(200),
    org_type VARCHAR(20) NOT NULL, -- FORWARDER, SHIPPER, CARRIER, ADMIN, WAREHOUSE
    registration_no VARCHAR(50), -- 사업자번호
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_org_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. 사용자 프로필 (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email VARCHAR(255),
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'USER', -- ADMIN, MANAGER, OPERATOR, USER
    grade_code VARCHAR(20) DEFAULT 'FAMILY' REFERENCES public.grade_master(grade_code),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_profile_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. 외부 기관 코드 매핑 (standard_code_mapping)
CREATE TABLE IF NOT EXISTS public.standard_code_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- AIRPORT, AIRLINE, PORT, STATUS 등
    external_org VARCHAR(50) NOT NULL, -- MOFA, IATA, PORT_AUTH, CARRIER_CODE 등
    external_code VARCHAR(50) NOT NULL,
    internal_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, external_org, external_code)
);

CREATE TRIGGER set_mapping_updated_at BEFORE UPDATE ON public.standard_code_mapping
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. 승급 심사 요청 (grade_promotion_request)
CREATE TABLE IF NOT EXISTS public.grade_promotion_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    current_grade VARCHAR(20) REFERENCES public.grade_master(grade_code),
    target_grade VARCHAR(20) REFERENCES public.grade_master(grade_code),
    request_reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    admin_comment TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_request_updated_at BEFORE UPDATE ON public.grade_promotion_request
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. 시스템 설정 (system_config)
CREATE TABLE IF NOT EXISTS public.system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_config_updated_at BEFORE UPDATE ON public.system_config
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 기본 이익률 설정
INSERT INTO public.system_config (config_key, config_value, description) VALUES
('DEFAULT_PROFIT_RATE', '0.15', 'Default profit rate for logistics calculation (15%)')
ON CONFLICT (config_key) DO NOTHING;
