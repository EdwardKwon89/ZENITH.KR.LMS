-- WBS 1.2: 마스터 데이터 시드 (Global Logistics Standards)
-- 작성자: Antigravity
-- 날짜: 2026-04-18

-- 1. 코드 그룹 데이터
INSERT INTO common_code_groups (id, name, description, is_system_reserved) VALUES
('CARGO_STATUS', '화물 상태 코드', '물류 라이프사이클에 따른 화물의 현재 상태', true),
('TRANSPORT_MODE', '운송 수단', '항공, 해운, 육상 등 운송 방식', true),
('UNIT_TYPE', '단구 단위', '무게, 부피, 포장 단위', true),
('MEMBERSHIP_LEVEL', '회원 등급', '고객사 등급 수준', true),
('COUNTRY_ISO', '국가 코드', 'ISO 3166-1 Alpha-2 기준 국가 정보', true);

-- 2. 화물 상태 코드 (Cargo Status) - 시퀀스 기반
INSERT INTO common_codes (group_id, code, name, sort_order) VALUES
('CARGO_STATUS', '10', 'REGISTERED', 10),
('CARGO_STATUS', '20', 'PICKED_UP', 20),
('CARGO_STATUS', '30', 'WAREHOUSED_ORIGIN', 30),
('CARGO_STATUS', '40', 'CUSTOMS_CLEARED_EX', 40),
('CARGO_STATUS', '50', 'IN_TRANSIT', 50),
('CARGO_STATUS', '60', 'WAREHOUSED_DEST', 60),
('CARGO_STATUS', '70', 'CUSTOMS_CLEARED_IM', 70),
('CARGO_STATUS', '80', 'OUT_FOR_DELIVERY', 80),
('CARGO_STATUS', '90', 'DELIVERED', 90);

-- 3. 운송 수단 (Transport Mode)
INSERT INTO common_codes (group_id, code, name, sort_order) VALUES
('TRANSPORT_MODE', 'AIR', 'Air Freight', 1),
('TRANSPORT_MODE', 'SEA', 'Sea Freight', 2),
('TRANSPORT_MODE', 'EXP', 'Express', 3),
('TRANSPORT_MODE', 'LAND', 'Road Transport', 4);

-- 4. 단위 (Unit Type)
INSERT INTO common_codes (group_id, code, name, sort_order) VALUES
('UNIT_TYPE', 'KG', 'Kilogram', 1),
('UNIT_TYPE', 'CBM', 'Cubic Meter', 2),
('UNIT_TYPE', 'PLT', 'Pallet', 3),
('UNIT_TYPE', 'BOX', 'Box', 4);

-- 5. 회원 등급 (Membership Level)
INSERT INTO common_codes (group_id, code, name, sort_order, metadata) VALUES
('MEMBERSHIP_LEVEL', 'IRON', 'Iron', 1, '{"discount": 0}'),
('MEMBERSHIP_LEVEL', 'BRONZE', 'Bronze', 2, '{"discount": 0.05}'),
('MEMBERSHIP_LEVEL', 'SILVER', 'Silver', 3, '{"discount": 0.10}'),
('MEMBERSHIP_LEVEL', 'GOLD', 'Gold', 4, '{"discount": 0.15}');

-- 6. 주요 넥서스 항구 (Ports Extension) - 기존 ports 테이블 활용
-- (기존에 중복된 코드가 있을 수 있으므로 ON CONFLICT 처리 권장하나, 초기 시드임을 감안)
INSERT INTO ports (code, name, type, country_code) VALUES
('ICN', 'Incheon International Airport', 'AIR', 'KR'),
('PUS', 'Busan Port', 'SEA', 'KR'),
('LAX', 'Los Angeles International Airport', 'AIR', 'US'),
('LGB', 'Long Beach Port', 'SEA', 'US'),
('SIN', 'Singapore Changi Airport', 'AIR', 'SG'),
('SHA', 'Shanghai Pudong International Airport', 'AIR', 'CN')
ON CONFLICT (code) DO NOTHING;
