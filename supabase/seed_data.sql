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

-- 3. 요율 카드 및 슬랩 요율 (Marketplace Rates — 신스키마)
-- zen_carriers는 migration 20260523130000_imp080_zen_carriers.sql에서 자동 생성됨
-- Eagle Express (ICN -> LAX, AIR, KG)
INSERT INTO zen_rate_cards (carrier_id, transport_mode, currency, tiers, valid_from)
SELECT c.id, 'AIR', 'USD',
  '[{"weight_min": 0, "unit_price": 5.50}, {"weight_min": 100, "unit_price": 4.80}, {"weight_min": 500, "unit_price": 3.90}]'::jsonb,
  CURRENT_DATE
FROM zen_carriers c WHERE c.code = 'ZENITH_AIR';

-- Oceanic Logistics (PUS -> LAX, SEA, CBM)
INSERT INTO zen_rate_cards (carrier_id, transport_mode, currency, tiers, valid_from)
SELECT c.id, 'SEA', 'USD',
  '[{"weight_min": 0, "unit_price": 2.10}, {"weight_min": 1000, "unit_price": 1.50}, {"weight_min": 10000, "unit_price": 0.95}]'::jsonb,
  CURRENT_DATE
FROM zen_carriers c WHERE c.code = 'ZENITH_SEA';

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
