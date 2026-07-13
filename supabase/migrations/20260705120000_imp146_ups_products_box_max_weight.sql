-- IMP-146 TASK-179: Box 상품 max_weight_kg 컬럼 추가 + Box 제품 시드 + Box 요율 시드
-- An-14 §12-1 #2

-- 1. zen_ups_products 에 max_weight_kg 컬럼 추가 (NULL 허용 — 기존 제품에는 해당 없음)
ALTER TABLE public.zen_ups_products
  ADD COLUMN max_weight_kg INT CHECK (max_weight_kg IS NULL OR max_weight_kg > 0);

-- 2. Box 제품 2종 시드
INSERT INTO public.zen_ups_products
  (product_code, sub_code, product_name, cargo_type, ddu_available, ddp_available, sort_order, max_weight_kg)
VALUES
  ('UPS_10KG_BOX',  'U10B', 'UPS 10 KG Box',  'NON_DOC', FALSE, TRUE, 7, 10),
  ('UPS_25KG_BOX',  'U25B', 'UPS 25 KG Box',  'NON_DOC', FALSE, TRUE, 8, 25)
ON CONFLICT (product_code) DO NOTHING;

-- 3. Box 상품용 요율 시드 (Zone 2~10, 1~15kg / 1~25kg 1kg 단위)
--    실제 요율은 UPS 공식 요율표 참조. 여기서는 EXPRESS NON_DOC 대비 약 15~25% 할인된 수치를 샘플로 기재.
--    Admin UI에서 추후 정확한 요율로 조정 가능.
INSERT INTO public.zen_ups_base_rates (product_id, zone_id, weight_kg, selling_price, cost_price, valid_from)
WITH
  prods AS (SELECT id FROM public.zen_ups_products WHERE product_code = 'UPS_10KG_BOX'),
  zns    AS (SELECT id, zone_code FROM public.zen_ups_zones WHERE zone_code != 'Z1'),
  wts    (weight_kg) AS (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15))
SELECT
  (SELECT id FROM prods),
  zns.id,
  wts.weight_kg,
  CASE zns.zone_code
    WHEN 'Z2'  THEN wts.weight_kg * 8500  WHEN 'Z3'  THEN wts.weight_kg * 10000
    WHEN 'Z4'  THEN wts.weight_kg * 12500 WHEN 'Z5'  THEN wts.weight_kg * 13500
    WHEN 'Z6'  THEN wts.weight_kg * 15000 WHEN 'Z7'  THEN wts.weight_kg * 16000
    WHEN 'Z8'  THEN wts.weight_kg * 14000 WHEN 'Z9'  THEN wts.weight_kg * 18500
    WHEN 'Z10' THEN wts.weight_kg * 21000
  END,
  CASE zns.zone_code
    WHEN 'Z2'  THEN wts.weight_kg * 6800  WHEN 'Z3'  THEN wts.weight_kg * 8000
    WHEN 'Z4'  THEN wts.weight_kg * 10000 WHEN 'Z5'  THEN wts.weight_kg * 10800
    WHEN 'Z6'  THEN wts.weight_kg * 12000 WHEN 'Z7'  THEN wts.weight_kg * 12800
    WHEN 'Z8'  THEN wts.weight_kg * 11200 WHEN 'Z9'  THEN wts.weight_kg * 14800
    WHEN 'Z10' THEN wts.weight_kg * 16800
  END,
  '2026-07-01'::date
FROM zns, wts
ON CONFLICT DO NOTHING;

INSERT INTO public.zen_ups_base_rates (product_id, zone_id, weight_kg, selling_price, cost_price, valid_from)
WITH
  prods AS (SELECT id FROM public.zen_ups_products WHERE product_code = 'UPS_25KG_BOX'),
  zns    AS (SELECT id, zone_code FROM public.zen_ups_zones WHERE zone_code != 'Z1'),
  wts    (weight_kg) AS (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24),(25))
SELECT
  (SELECT id FROM prods),
  zns.id,
  wts.weight_kg,
  CASE zns.zone_code
    WHEN 'Z2'  THEN wts.weight_kg * 7500  WHEN 'Z3'  THEN wts.weight_kg * 9000
    WHEN 'Z4'  THEN wts.weight_kg * 11000 WHEN 'Z5'  THEN wts.weight_kg * 12000
    WHEN 'Z6'  THEN wts.weight_kg * 13500 WHEN 'Z7'  THEN wts.weight_kg * 14500
    WHEN 'Z8'  THEN wts.weight_kg * 12500 WHEN 'Z9'  THEN wts.weight_kg * 16500
    WHEN 'Z10' THEN wts.weight_kg * 19000
  END,
  CASE zns.zone_code
    WHEN 'Z2'  THEN wts.weight_kg * 6000  WHEN 'Z3'  THEN wts.weight_kg * 7200
    WHEN 'Z4'  THEN wts.weight_kg * 8800  WHEN 'Z5'  THEN wts.weight_kg * 9600
    WHEN 'Z6'  THEN wts.weight_kg * 10800 WHEN 'Z7'  THEN wts.weight_kg * 11600
    WHEN 'Z8'  THEN wts.weight_kg * 10000 WHEN 'Z9'  THEN wts.weight_kg * 13200
    WHEN 'Z10' THEN wts.weight_kg * 15200
  END,
  '2026-07-01'::date
FROM zns, wts
ON CONFLICT DO NOTHING;
