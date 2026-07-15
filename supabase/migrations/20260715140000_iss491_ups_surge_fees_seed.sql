-- Issue #491: UPS 급증 긴급 수수료 UAT Seed — Agency/Agency_Shipper 조회 검증용
-- 출처: UPS 급증 수수료.pdf(2026-07-02 업데이트) 2026-05-24~2026-07-04 구간 요율표
--   (2026-07-05~ 구간도 동일 수치로 재공지되어 있어 무기한 적용으로 등록)
-- 통화: 아시아·태평양 역내 목적지는 목적지 현지 통화(원문 표 그대로), UAE/유럽/북미는 한국 출발 기준 KRW 표시 통화 사용
-- 원가율: 기존 TC-UPS-ENGINE-07 테스트 픽스처(KRW 4,722 → 원가 3,800, 약 80.5%)와 동일 비율 적용

INSERT INTO public.zen_ups_surge_fees
  (destination_country_code, selling_rate_per_kg, cost_rate_per_kg, currency, effective_from, effective_until, is_active)
VALUES
  -- 아시아·태평양 역내 (Z2~Z4) — 목적지 현지 통화, 목적지 국가 자체 열 요율
  ('CHN', 0.75,    0.60,    'RMB', '2026-07-05', NULL, TRUE),
  ('JPN', 15.00,   12.00,   'JPY', '2026-07-05', NULL, TRUE),
  ('TWN', 3.13,    2.50,    'TWD', '2026-07-05', NULL, TRUE),
  ('HKG', 0.82,    0.66,    'HKD', '2026-07-05', NULL, TRUE),
  ('SGP', 0.13,    0.10,    'SGD', '2026-07-05', NULL, TRUE),
  ('MYS', 0.40,    0.32,    'MYR', '2026-07-05', NULL, TRUE),
  ('THA', 3.00,    2.40,    'THB', '2026-07-05', NULL, TRUE),
  ('VNM', 2350.00, 1880.00, 'VND', '2026-07-05', NULL, TRUE),
  ('PHL', 0.10,    0.08,    'USD', '2026-07-05', NULL, TRUE),
  ('IDN', 1480.00, 1184.00, 'IDR', '2026-07-05', NULL, TRUE),
  ('AUS', 0.15,    0.12,    'AUD', '2026-07-05', NULL, TRUE),
  ('IND', 9.00,    7.20,    'INR', '2026-07-05', NULL, TRUE),

  -- 중동 (Z5) — 한국 출발 기준, UAE만 요율 존재 (Israel·기타 중동은 PDF상 N.A.)
  ('ARE', 4722.00, 3800.00, 'KRW', '2026-07-05', NULL, TRUE),

  -- 유럽 (Z6/Z7) — 한국 출발 기준 유럽 통합 요율(KRW)
  ('DEU', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('GBR', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('FRA', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('ITA', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('ESP', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('NLD', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('BEL', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('CHE', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('SWE', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('NOR', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('FIN', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('DNK', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('POL', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('CZE', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),
  ('AUT', 4220.00, 3376.00, 'KRW', '2026-07-05', NULL, TRUE),

  -- 북미 (Z8) — 한국 출발 기준 미국/캐나다 통합 요율(KRW)
  ('USA', 716.00,  572.80,  'KRW', '2026-07-05', NULL, TRUE),
  ('CAN', 716.00,  572.80,  'KRW', '2026-07-05', NULL, TRUE);
