-- 1. 기초 항구/공항 정보 (Ports)
INSERT INTO zen_ports (code, name, type, country_code) VALUES
('ICN', '인천 국제공항', 'AIR', 'KR'),
('PUS', '부산항', 'SEA', 'KR'),
('LAX', 'Los Angeles International Airport', 'AIR', 'US'),
('JFK', 'John F. Kennedy International Airport', 'AIR', 'US'),
('HKG', 'Hong Kong International Airport', 'AIR', 'CN'),
('SGP', 'Singapore Changi Airport', 'AIR', 'SG')
ON CONFLICT (code) DO NOTHING;

-- 2. 운송사 조직 정보 (Carriers)
INSERT INTO zen_organizations (name, type, status, metadata) VALUES
('Eagle Express', 'CARRIER', 'ACTIVE', '{"business_no": "123-45-67890", "specialty": "AIR"}'),
('Oceanic Logistics', 'CARRIER', 'ACTIVE', '{"business_no": "987-65-43210", "specialty": "SEA"}')
ON CONFLICT DO NOTHING;

-- 3. 요율 카드 및 슬랩 요율 (Marketplace Rates)
-- Eagle Express (ICN -> LAX, AIR, KG)
DO $$
DECLARE
    v_org_id UUID;
    v_card_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM zen_organizations WHERE name = 'Eagle Express' LIMIT 1;
    
    INSERT INTO zen_rate_cards (org_id, origin_code, dest_code, mode, unit_type, unit_price, currency, transit_days, is_direct)
    VALUES (v_org_id, 'ICN', 'LAX', 'AIR', 'KG', 5.5, 'USD', 2, true)
    RETURNING id INTO v_card_id;

    -- Slab Tiers for Eagle Express
    INSERT INTO zen_rate_tiers (rate_card_id, weight_min, unit_price, min_total_price) VALUES
    (v_card_id, 0, 8.5, 50),   -- 0~45kg 미만: 높은 단가
    (v_card_id, 45, 6.2, 50),  -- 45kg 이상: 중간 단가
    (v_card_id, 100, 5.5, 50); -- 100kg 이상: 최적 단가
END $$;

-- Oceanic Logistics (PUS -> LAX, SEA, CBM)
DO $$
DECLARE
    v_org_id UUID;
    v_card_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM zen_organizations WHERE name = 'Oceanic Logistics' LIMIT 1;
    
    INSERT INTO zen_rate_cards (org_id, origin_code, dest_code, mode, unit_type, unit_price, currency, transit_days, is_direct)
    VALUES (v_org_id, 'PUS', 'LAX', 'SEA', 'CBM', 120.0, 'USD', 15, true)
    RETURNING id INTO v_card_id;

    -- Slab Tiers for Oceanic Logistics
    INSERT INTO zen_rate_tiers (rate_card_id, weight_min, unit_price, min_total_price) VALUES
    (v_card_id, 0, 150.0, 300), -- 0~1CBM
    (v_card_id, 1, 120.0, 300), -- 1~5CBM
    (v_card_id, 5, 100.0, 300); -- 5CBM 이상
END $$;
