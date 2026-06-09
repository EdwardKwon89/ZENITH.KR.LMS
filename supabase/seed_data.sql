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

-- 4. 통관 서비스 조직 (CUSTOMS)
INSERT INTO zen_organizations (name, type, status, metadata) VALUES
('Korea Customs Clearance', 'CUSTOMS', 'ACTIVE', '{"business_no": "111-22-33333", "specialty": "CUSTOMS"}'),
('Japan Broker Services', 'CUSTOMS', 'ACTIVE', '{"business_no": "222-33-44444", "specialty": "CUSTOMS"}')
ON CONFLICT DO NOTHING;

-- 5. 통관 서비스 요율 (Customs Rates)
DO $$
DECLARE
    v_korea_org UUID;
    v_japan_org UUID;
BEGIN
    SELECT id INTO v_korea_org FROM zen_organizations WHERE name = 'Korea Customs Clearance' LIMIT 1;
    SELECT id INTO v_japan_org FROM zen_organizations WHERE name = 'Japan Broker Services' LIMIT 1;

    -- Korea Customs: US 통관 요율
    INSERT INTO zen_customs_rates (org_id, country_code, currency, cost_per_kg, cost_per_cbm, fixed_fee, transit_days, valid_from, is_active)
    VALUES (v_korea_org, 'US', 'USD', 2.50, 50.00, 100.00, 2, CURRENT_DATE, true);

    -- Korea Customs: CN 통관 요율
    INSERT INTO zen_customs_rates (org_id, country_code, currency, cost_per_kg, cost_per_cbm, fixed_fee, transit_days, valid_from, is_active)
    VALUES (v_korea_org, 'CN', 'USD', 1.80, 35.00, 80.00, 3, CURRENT_DATE, true);

    -- Korea Customs: JP 통관 요율
    INSERT INTO zen_customs_rates (org_id, country_code, currency, cost_per_kg, fixed_fee, transit_days, valid_from, is_active)
    VALUES (v_korea_org, 'JP', 'JPY', 350.00, 10000.00, 2, CURRENT_DATE, true);

    -- Japan Broker: US 통관 요율
    INSERT INTO zen_customs_rates (org_id, country_code, currency, cost_per_kg, cost_per_cbm, fixed_fee, transit_days, valid_from, is_active)
    VALUES (v_japan_org, 'US', 'USD', 3.00, 60.00, 120.00, 2, CURRENT_DATE, true);

    -- Japan Broker: SG 통관 요율
    INSERT INTO zen_customs_rates (org_id, country_code, currency, cost_per_kg, cost_per_cbm, fixed_fee, transit_days, valid_from, is_active)
    VALUES (v_japan_org, 'SG', 'USD', 2.20, 40.00, 90.00, 4, CURRENT_DATE, true);
END $$;

-- 6. 배송 서비스 조직 (DELIVERY)
INSERT INTO zen_organizations (name, type, status, metadata) VALUES
('Korea Express Delivery', 'DELIVERY', 'ACTIVE', '{"business_no": "333-44-55555", "specialty": "DELIVERY"}')
ON CONFLICT DO NOTHING;

-- 7. 배송 서비스 요율 (Delivery Rates — LOCAL / TOTAL)
DO $$
DECLARE
    v_delivery_org UUID;
BEGIN
    SELECT id INTO v_delivery_org FROM zen_organizations WHERE name = 'Korea Express Delivery' LIMIT 1;

    -- LOCAL: 국내 배송 (KR)
    INSERT INTO zen_delivery_rates (org_id, service_type, country_code, currency, cost_per_kg, transit_days, valid_from, is_active)
    VALUES (v_delivery_org, 'LOCAL', 'KR', 'KRW', 3000.00, 1, CURRENT_DATE, true);

    -- TOTAL: ICN → LAX (AIR) 국제 배송
    INSERT INTO zen_delivery_rates (org_id, service_type, transport_mode, origin_code, dest_code, currency, cost_per_kg, transit_days, valid_from, is_active)
    VALUES (v_delivery_org, 'TOTAL', 'AIR', 'ICN', 'LAX', 'USD', 6.50, 3, CURRENT_DATE, true);

    -- TOTAL: PUS → LAX (SEA) 국제 배송
    INSERT INTO zen_delivery_rates (org_id, service_type, transport_mode, origin_code, dest_code, currency, cost_per_kg, transit_days, valid_from, is_active)
    VALUES (v_delivery_org, 'TOTAL', 'SEA', 'PUS', 'LAX', 'USD', 3.50, 18, CURRENT_DATE, true);

    -- TOTAL: ICN → HKG (AIR) 국제 배송
    INSERT INTO zen_delivery_rates (org_id, service_type, transport_mode, origin_code, dest_code, currency, cost_per_kg, transit_days, valid_from, is_active)
    VALUES (v_delivery_org, 'TOTAL', 'AIR', 'ICN', 'HKG', 'USD', 4.00, 2, CURRENT_DATE, true);
END $$;
