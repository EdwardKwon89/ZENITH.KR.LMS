-- WBS 1.3: 항공 물류 마스터 데이터 고도화 (IATA/Prefix)
-- 작성자: Antigravity
-- 날짜: 2026-04-22

-- 1. zen_organizations 테이블 스키마 확장 (항공사 식별자 추가)
ALTER TABLE public.zen_organizations 
ADD COLUMN IF NOT EXISTS iata_code CHAR(2),
ADD COLUMN IF NOT EXISTS prefix_code CHAR(3);

COMMENT ON COLUMN public.zen_organizations.iata_code IS 'IATA 항공사 2자리 코드 (예: KE, OZ)';
COMMENT ON COLUMN public.zen_organizations.prefix_code IS 'AWB Prefix 3자리 숫자 (예: 180, 988)';

-- 2. 기존 데이터 마이그레이션 (SNTL/Eagle 등 기존 캐리어)
UPDATE public.zen_organizations 
SET iata_code = 'KE', prefix_code = '180' 
WHERE name ILIKE '%SNTL%' OR name ILIKE '%Korean Air%';

UPDATE public.zen_organizations 
SET iata_code = 'OZ', prefix_code = '988' 
WHERE name ILIKE '%Asiana%';

-- 3. 신규 글로벌 항공사 시드 데이터 추가
INSERT INTO public.zen_organizations (name, type, iata_code, prefix_code, status, metadata)
VALUES 
('Korean Air', 'CARRIER', 'KE', '180', 'ACTIVE', '{"specialty": "AIR", "region": "GLOBAL"}'),
('Asiana Airlines', 'CARRIER', 'OZ', '988', 'ACTIVE', '{"specialty": "AIR", "region": "GLOBAL"}'),
('FedEx Express', 'CARRIER', 'FX', '023', 'ACTIVE', '{"specialty": "AIR", "region": "GLOBAL"}'),
('Lufthansa Cargo', 'CARRIER', 'LH', '020', 'ACTIVE', '{"specialty": "AIR", "region": "EU"}'),
('Cathay Pacific Cargo', 'CARRIER', 'CX', '160', 'ACTIVE', '{"specialty": "AIR", "region": "ASIA"}'),
('Emirates SkyCargo', 'CARRIER', 'EK', '176', 'ACTIVE', '{"specialty": "AIR", "region": "ME"}')
ON CONFLICT DO NOTHING;

-- 4. 글로벌 주요 공항(Airport) 마스터 데이터 확충
-- 기존 zen_ports 형식에 맞춰 추가
INSERT INTO public.zen_ports (code, name, type, country_code)
VALUES 
('ICN', 'Incheon International Airport', 'AIR', 'KR'),
('GMP', 'Gimpo International Airport', 'AIR', 'KR'),
('LAX', 'Los Angeles International Airport', 'AIR', 'US'),
('JFK', 'John F. Kennedy International Airport', 'AIR', 'US'),
('ORD', 'O''Hare International Airport', 'AIR', 'US'),
('NRT', 'Narita International Airport', 'AIR', 'JP'),
('HND', 'Haneda Airport', 'AIR', 'JP'),
('HKG', 'Hong Kong International Airport', 'AIR', 'HK'),
('PVG', 'Shanghai Pudong International Airport', 'AIR', 'CN'),
('SIN', 'Singapore Changi Airport', 'AIR', 'SG'),
('LHR', 'London Heathrow Airport', 'AIR', 'GB'),
('FRA', 'Frankfurt Airport', 'AIR', 'DE'),
('CDG', 'Charles de Gaulle Airport', 'AIR', 'FR'),
('DXB', 'Dubai International Airport', 'AIR', 'AE')
ON CONFLICT (code) DO UPDATE 
SET type = 'AIR', name = EXCLUDED.name;
