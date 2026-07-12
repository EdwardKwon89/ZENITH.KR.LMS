-- UPS UAT Seed Data — zones, zone_countries, base_rates, fuel_surcharges, other_charges, flight_plans
-- TASK: Issue #134 UPS UAT 사전 점검

-- 1. zen_ups_zones (10 구간)
INSERT INTO public.zen_ups_zones (zone_code, zone_name, description, sort_order) VALUES
  ('Z1',  'Zone 1 - Domestic Korea',        '국내 (대한민국)', 1),
  ('Z2',  'Zone 2 - East Asia (China/Japan)', '중국, 일본 등 동아시아', 2),
  ('Z3',  'Zone 3 - SE Asia',                '동남아시아 (싱가포르, 말레이시아 등)', 3),
  ('Z4',  'Zone 4 - Oceania',                '오세아니아 (호주, 뉴질랜드)', 4),
  ('Z5',  'Zone 5 - West Asia / Middle East','중동 / 서아시아', 5),
  ('Z6',  'Zone 6 - Europe Core',            '유럽 주요국 (독일, 영국, 프랑스 등)', 6),
  ('Z7',  'Zone 7 - Europe Extended',        '유럽 기타', 7),
  ('Z8',  'Zone 8 - North America',          '북미 (미국, 캐나다)', 8),
  ('Z9',  'Zone 9 - Central & South America','중남미', 9),
  ('Z10', 'Zone 10 - Africa',                '아프리카', 10)
ON CONFLICT (zone_code) DO NOTHING;

-- 2. zen_ups_zone_countries (대표 국가 매핑) — ISO 3166-1 alpha-2
INSERT INTO public.zen_ups_zone_countries (zone_id, country_code)
SELECT z.id, c.country_code
FROM (VALUES
  ('Z2', 'CN'), ('Z2', 'JP'), ('Z2', 'TW'), ('Z2', 'HK'),
  ('Z3', 'SG'), ('Z3', 'MY'), ('Z3', 'TH'), ('Z3', 'VN'), ('Z3', 'PH'), ('Z3', 'ID'), ('Z3', 'BN'),
  ('Z4', 'AU'), ('Z4', 'NZ'),
  ('Z5', 'AE'), ('Z5', 'SA'), ('Z5', 'QA'), ('Z5', 'KW'), ('Z5', 'IL'), ('Z5', 'TR'), ('Z5', 'IN'),
  ('Z6', 'DE'), ('Z6', 'GB'), ('Z6', 'FR'), ('Z6', 'IT'), ('Z6', 'ES'), ('Z6', 'NL'), ('Z6', 'BE'), ('Z6', 'CH'),
  ('Z7', 'SE'), ('Z7', 'NO'), ('Z7', 'FI'), ('Z7', 'DK'), ('Z7', 'PL'), ('Z7', 'CZ'), ('Z7', 'AT'),
  ('Z8', 'US'), ('Z8', 'CA'),
  ('Z9', 'MX'), ('Z9', 'BR'), ('Z9', 'AR'), ('Z9', 'CL'), ('Z9', 'CO'),
  ('Z10','ZA'), ('Z10','NG'), ('Z10','KE'), ('Z10','EG')
) AS c(zone_code, country_code)
JOIN public.zen_ups_zones z ON z.zone_code = c.zone_code
ON CONFLICT (country_code) DO NOTHING;

-- 3. zen_ups_base_rates — 대표 Zone(Z2~Z10) × Product × Weight 샘플 (selling/cost 분리)
INSERT INTO public.zen_ups_base_rates (product_id, zone_id, weight_kg, selling_price, cost_price, valid_from)
WITH
  prods AS (SELECT id, product_code FROM public.zen_ups_products),
  zns    AS (SELECT id, zone_code FROM public.zen_ups_zones WHERE zone_code != 'Z1'),
  wts    (weight_kg) AS (VALUES (0.5),(1.0),(1.5),(2.0),(2.5),(3.0),(3.5),(4.0),(4.5),(5.0),(7.0),(10.0),(15.0),(20.0),(25.0),(30.0)),
  zone_rates AS (
    SELECT id,
      CASE zone_code
        WHEN 'Z2'  THEN 10000 WHEN 'Z3'  THEN 12000 WHEN 'Z4'  THEN 15000
        WHEN 'Z5'  THEN 16000 WHEN 'Z6'  THEN 18000 WHEN 'Z7'  THEN 19000
        WHEN 'Z8'  THEN 17000 WHEN 'Z9'  THEN 22000 WHEN 'Z10' THEN 25000
      END AS selling_rate,
      CASE zone_code
        WHEN 'Z2'  THEN 8000  WHEN 'Z3'  THEN 9600  WHEN 'Z4'  THEN 12000
        WHEN 'Z5'  THEN 12800 WHEN 'Z6'  THEN 14400 WHEN 'Z7'  THEN 15200
        WHEN 'Z8'  THEN 13600 WHEN 'Z9'  THEN 17600 WHEN 'Z10' THEN 20000
      END AS cost_rate
    FROM zns
  ),
  prod_factors AS (
    SELECT id,
      CASE product_code
        WHEN 'WW_EXPRESS_DOC'    THEN 0.7
        WHEN 'WW_EXPRESS_NONDOC' THEN 1.0
        WHEN 'WW_SAVER_DOC'      THEN 0.6
        WHEN 'WW_SAVER_NONDOC'   THEN 0.85
        WHEN 'WW_EXPEDITED'      THEN 1.2
        WHEN 'WW_FLIGHT'         THEN 2.0
      END AS factor
    FROM prods
  )
SELECT
  pf.id,
  zr.id,
  w.weight_kg,
  ROUND(w.weight_kg * zr.selling_rate * pf.factor, 2),
  ROUND(w.weight_kg * zr.cost_rate * pf.factor, 2),
  CURRENT_DATE
FROM prod_factors pf
CROSS JOIN zone_rates zr
CROSS JOIN wts w
ON CONFLICT (product_id, zone_id, weight_kg, valid_from) DO NOTHING;

-- 4. zen_ups_fuel_surcharges (2026년 6월 마지막 주 기준)
INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
SELECT
  p.id,
  DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::DATE AS effective_week,
  0.185 AS selling_rate,
  0.155 AS cost_rate
FROM public.zen_ups_products p
ON CONFLICT (product_id, effective_week) DO NOTHING;

-- Global fuel surcharge (product_id = NULL, all products)
INSERT INTO public.zen_ups_fuel_surcharges (product_id, effective_week, selling_rate, cost_rate)
VALUES (NULL, DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day')::DATE, 0.185, 0.155)
ON CONFLICT (product_id, effective_week) DO NOTHING;

-- 5. zen_ups_other_charges — 공통 부가 요금 코드
INSERT INTO public.zen_ups_other_charges (charge_code, charge_name, unit, fuel_surcharge_applicable, selling_price, cost_price) VALUES
  ('DDU',       'Delivery Duty Unpaid',        'LOT', FALSE, 0, 0),
  ('DDP',       'Delivery Duty Paid',          'LOT', FALSE, 30000, 25000),
  ('FUEL',      'Fuel Surcharge',              'LOT', FALSE, 0, 0),
  ('OVERSIZE',  'Oversize / Bulky Package',    'PKG', TRUE,  15000, 12000),
  ('SURGE',     'Peak Season Surcharge',       'PKG', TRUE,  10000, 8000),
  ('RESI',      'Residential Delivery',        'PKG', FALSE, 5000, 4000),
  ('SATURDAY',  'Saturday Delivery',           'PKG', FALSE, 20000, 16000),
  ('INSURANCE', 'Declared Value Insurance',    'LOT', FALSE, 0, 0)
ON CONFLICT (charge_code) DO NOTHING;

-- 6. zen_ups_flight_plans — 대표 항공편 (ICN 출발)
INSERT INTO public.zen_ups_flight_plans (product_id, flight_no, origin_airport, dest_airport, frequency, valid_from)
SELECT
  p.id,
  f.flight_no,
  f.origin_airport,
  f.dest_airport,
  f.frequency,
  CURRENT_DATE
FROM (VALUES
  ('ICN-SFO-UPS01', 'ICN', 'SFO', '매일'),
  ('ICN-LAX-UPS02', 'ICN', 'LAX', '매일'),
  ('ICN-NRT-UPS03', 'ICN', 'NRT', '매일'),
  ('ICN-HKG-UPS04', 'ICN', 'HKG', '매일'),
  ('ICN-SIN-UPS05', 'ICN', 'SIN', '주 6회'),
  ('ICN-FRA-UPS06', 'ICN', 'FRA', '주 5회'),
  ('ICN-LHR-UPS07', 'ICN', 'LHR', '주 5회'),
  ('ICN-DXB-UPS08', 'ICN', 'DXB', '주 4회')
) AS f(flight_no, origin_airport, dest_airport, frequency)
CROSS JOIN (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT') p
ON CONFLICT DO NOTHING;
