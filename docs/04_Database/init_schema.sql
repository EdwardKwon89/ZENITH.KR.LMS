-- 1. 회원 등급 마스터 (grade_master)
CREATE TABLE IF NOT EXISTS public.grade_master (
    grade_code VARCHAR(20) PRIMARY KEY,
    grade_name VARCHAR(50) NOT NULL,
    discount_rate DECIMAL(5, 2) DEFAULT 0.00, -- 할인율 (%)
    benefit_desc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 초기 등급 데이터 삽입
INSERT INTO public.grade_master (grade_code, grade_name, discount_rate) VALUES
('FAMILY', 'Family', 0.0),
('BRONZE', 'Bronze', 3.0),
('SILVER', 'Silver', 5.0),
('GOLD', 'Gold', 8.0),
('PLATINUM', 'Platinum', 10.0)
ON CONFLICT (grade_code) DO NOTHING;

-- 2. 외부 기관 코드 매핑 (standard_code_mapping)
CREATE TABLE IF NOT EXISTS public.standard_code_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- AIRPORT, AIRLINE, PORT 등
    external_org VARCHAR(50) NOT NULL, -- MOFA, IATA, PORT_AUTH 등
    external_code VARCHAR(50) NOT NULL,
    internal_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, external_org, external_code)
);

-- 3. 승급 심사 요청 (grade_promotion_request)
CREATE TABLE IF NOT EXISTS public.grade_promotion_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    current_grade VARCHAR(20),
    target_grade VARCHAR(20),
    request_reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    admin_comment TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 시스템 설정 (system_config)
CREATE TABLE IF NOT EXISTS public.system_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기본 이익률 설정
INSERT INTO public.system_config (config_key, config_value, description) VALUES
('DEFAULT_PROFIT_RATE', '0.15', 'Default profit rate for logistics calculation (15%)')
ON CONFLICT (config_key) DO NOTHING;
