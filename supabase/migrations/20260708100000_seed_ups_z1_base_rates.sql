-- Z1(국내) 기준요금 시드 데이터 추가
-- 참조: docs/80_RawData/20260609 SNTL 자료 내 요금 Excel/PDF
-- 기존 seed(20260628000000_ups_seed_data.sql)가 WHERE zone_code != 'Z1'로 제외하여 누락됨
-- 국내 Z1 요금: Z2(10,000원/kg) 대비 약 50% 수준인 5,000원/kg 기준

INSERT INTO public.zen_ups_base_rates (product_id, zone_id, weight_kg, selling_price, cost_price, valid_from)
WITH
  prods AS (SELECT id, product_code FROM public.zen_ups_products WHERE max_weight_kg IS NULL),
  z1    AS (SELECT id FROM public.zen_ups_zones WHERE zone_code = 'Z1'),
  wts   (weight_kg) AS (VALUES (0.5),(1.0),(1.5),(2.0),(2.5),(3.0),(3.5),(4.0),(4.5),(5.0),(7.0),(10.0),(15.0),(20.0),(25.0),(30.0)),
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
  z1.id,
  w.weight_kg,
  ROUND(5000 * w.weight_kg * pf.factor / 0.5)::numeric AS selling_price,
  ROUND(4000 * w.weight_kg * pf.factor / 0.5)::numeric AS cost_price,
  '2026-07-01'::date AS valid_from
FROM prod_factors pf, z1, wts w
ON CONFLICT (product_id, zone_id, weight_kg, valid_from) DO NOTHING;

-- 검증
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.zen_ups_base_rates
  WHERE zone_id = (SELECT id FROM public.zen_ups_zones WHERE zone_code = 'Z1');
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Z1 기준요금이 생성되지 않았습니다.';
  END IF;
  RAISE NOTICE 'Z1 기준요금 생성 완료: %건', v_count;
END $$;
