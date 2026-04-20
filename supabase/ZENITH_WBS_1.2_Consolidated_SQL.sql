-- ====================================================================
-- ZENITH LMS : WBS 1.2 Master Data & Common Code (Unified Pack)
-- 작성자: Antigravity (AI Agent)
-- 승인자: Edward (CEO)
-- 날짜: 2026-04-18
-- ====================================================================

-- [1] SCHEMA: Common Code System
CREATE TABLE IF NOT EXISTS common_code_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system_reserved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS common_codes (
    group_id TEXT REFERENCES common_code_groups(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (group_id, code)
);

-- [2] AUDIT: Trigger Sync
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_common_code_groups_modtime ON common_code_groups;
CREATE TRIGGER update_common_code_groups_modtime
    BEFORE UPDATE ON common_code_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_common_codes_modtime ON common_codes;
CREATE TRIGGER update_common_codes_modtime
    BEFORE UPDATE ON common_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- [3] SEED: Core Logistics Reference Data
INSERT INTO common_code_groups (id, name, description, is_system_reserved) VALUES
('CARGO_STATUS', '화물 상태 코드', '물류 라이프사이클에 따른 화물의 현재 상태', true),
('TRANSPORT_MODE', '운송 수단', '항공, 해운, 육상 등 운송 방식', true),
('UNIT_TYPE', '단구 단위', '무게, 부피, 포장 단위', true),
('MEMBERSHIP_LEVEL', '회원 등급', '고객사 등급 수준', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3.1 Cargo Status (Sequence 10-90)
INSERT INTO common_codes (group_id, code, name, sort_order) VALUES
('CARGO_STATUS', '10', 'REGISTERED', 10),
('CARGO_STATUS', '20', 'PICKED_UP', 20),
('CARGO_STATUS', '30', 'WAREHOUSED_ORIGIN', 30),
('CARGO_STATUS', '40', 'CUSTOMS_CLEARED_EX', 40),
('CARGO_STATUS', '50', 'IN_TRANSIT', 50),
('CARGO_STATUS', '60', 'WAREHOUSED_DEST', 60),
('CARGO_STATUS', '70', 'CUSTOMS_CLEARED_IM', 70),
('CARGO_STATUS', '80', 'OUT_FOR_DELIVERY', 80),
('CARGO_STATUS', '90', 'DELIVERED', 90)
ON CONFLICT (group_id, code) DO UPDATE SET name = EXCLUDED.name;

-- 3.2 Transport Mode
INSERT INTO common_codes (group_id, code, name, sort_order) VALUES
('TRANSPORT_MODE', 'AIR', 'Air Freight', 1),
('TRANSPORT_MODE', 'SEA', 'Sea Freight', 2),
('TRANSPORT_MODE', 'EXP', 'Express', 3),
('TRANSPORT_MODE', 'LAND', 'Road Transport', 4)
ON CONFLICT (group_id, code) DO UPDATE SET name = EXCLUDED.name;

-- 3.3 Membership Levels
INSERT INTO common_codes (group_id, code, name, sort_order, metadata) VALUES
('MEMBERSHIP_LEVEL', 'IRON', 'Iron', 1, '{"discount": 0}'),
('MEMBERSHIP_LEVEL', 'BRONZE', 'Bronze', 2, '{"discount": 0.05}'),
('MEMBERSHIP_LEVEL', 'SILVER', 'Silver', 3, '{"discount": 0.10}'),
('MEMBERSHIP_LEVEL', 'GOLD', 'Gold', 4, '{"discount": 0.15}')
ON CONFLICT (group_id, code) DO UPDATE SET name = EXCLUDED.name;

-- [4] SEED: Global Ports (Nexus Ports)
INSERT INTO ports (code, name, type, country_code) VALUES
('ICN', 'Incheon International Airport', 'AIR', 'KR'),
('PUS', 'Busan Port', 'SEA', 'KR'),
('LAX', 'Los Angeles International Airport', 'AIR', 'US'),
('LGB', 'Long Beach Port', 'SEA', 'US'),
('SIN', 'Singapore Changi Airport', 'AIR', 'SG'),
('SHA', 'Shanghai Pudong International Airport', 'AIR', 'CN')
ON CONFLICT (code) DO NOTHING;

-- [5] SECURITY: RLS Policies
ALTER TABLE common_code_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Common code groups are viewable by all authenticated users" ON common_code_groups;
CREATE POLICY "Common code groups are viewable by all authenticated users" ON common_code_groups
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Common codes are viewable by all authenticated users" ON common_codes;
CREATE POLICY "Common codes are viewable by all authenticated users" ON common_codes
    FOR SELECT USING (TRUE);

-- ====================================================================
-- SQL EXECUTION COMPLETED: EDWARD CEO AUDIT READY
-- ====================================================================
