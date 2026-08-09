BEGIN;
-- Zone 1(중국 본토, CNN) 누락 데이터 보강 — zen_ups_weight_tier_rates / zen_ups_freight_minimums
--
-- 발견 경위: docs/80_RawData/20260609 SNTL 자료/UPS_원가표.pdf(= ups_원가_260609.pdf, 데이터 동일)
--   전량(1,470건)을 zen_ups_base_rates/zen_ups_weight_tier_rates/zen_ups_freight_minimums 최종 상태와
--   전수 대조 — base_rates(20kg 이하)는 전부 일치했으나, 아래 두 테이블은 Zone 1 행이 처음부터 한 번도
--   생성되지 않은 것을 확인:
--     - 최초 시드(20260705140000_imp146_ups_tier_dwb_freight_min.sql)가 base_rates 시드와 동일하게
--       `WHERE zone_code != 'Z1'`로 Z1을 제외
--     - base_rates는 이후(20260719000100/000300) 실측치로 Z1까지 보정됐으나, 이 두 테이블은
--       Z1 보정이 누락된 채 방치됨(전체 마이그레이션 이력에 zone_code='Z1' 언급 0건, grep으로 확인)
--
-- 영향: Zone 1(=CNN, 중국 본토 Excl. South — ups_zones_kr.pdf와 zen_ups_zone_countries 대조로 확인)
--   행 중국 UPS 주문이 ①20kg 초과(EXPRESS_NONDOC/SAVER_NONDOC/EXPEDITED tier) 또는 ②WW_FLIGHT 상품을
--   이용할 경우 원가 조회 자체가 불가능한 상태였음.
--
-- cost_price: PDF(UPS_원가표.pdf) Zone 1 열 실측치 그대로 반영(전수 대조 완료, 신뢰 가능)
-- price_per_kg_selling: docs/80_RawData/20260609 SNTL 자료/UPS 운임 및 부가서비스.pdf(UPS 2026 Rate
--   and Service Guide, 수출) Zone 1 열 실측치 — JSJung 확인(2026-08-09): UPS 공식 정가를 SNTL 판매가로
--   그대로 사용. WW_FLIGHT는 이 문서의 "UPS Worldwide Express Freight®"(p.26, Midday 아님 — JSJung
--   확인) 수출/Door-to-Door 표 실측치 반영(71-99·100-299 동일값, "300 and above"가 300~999·1000+ 공통 적용).

INSERT INTO public.zen_ups_weight_tier_rates
  (product_id, zone_id, tier_min_kg, tier_max_kg, price_per_kg_selling, price_per_kg_cost, valid_from)
WITH
  z1 AS (SELECT id FROM public.zen_ups_zones WHERE zone_code = 'Z1'),
  -- (product_code, tier_min_kg, tier_max_kg, cost_per_kg, selling_per_kg) — PDF Zone 1 열 실측치
  tier_rows (product_code, tier_min_kg, tier_max_kg, cost_per_kg, selling_per_kg) AS (
    VALUES
      ('WW_SAVER_NONDOC',   21.00,  44.00, 2823.00, 18600.00),
      ('WW_SAVER_NONDOC',   45.00,  70.00, 2823.00, 18600.00),
      ('WW_SAVER_NONDOC',   71.00,  99.00, 2823.00, 17000.00),
      ('WW_SAVER_NONDOC',  100.00, 299.00, 2823.00, 17000.00),
      ('WW_SAVER_NONDOC',  300.00, 499.00, 2823.00, 16400.00),
      ('WW_SAVER_NONDOC',  500.00, 999.00, 2823.00, 16400.00),
      ('WW_SAVER_NONDOC', 1000.00,   NULL, 2823.00, 16400.00),

      ('WW_EXPRESS_NONDOC',   21.00,  44.00, 3006.00, 19700.00),
      ('WW_EXPRESS_NONDOC',   45.00,  70.00, 3006.00, 19700.00),
      ('WW_EXPRESS_NONDOC',   71.00,  99.00, 3006.00, 18000.00),
      ('WW_EXPRESS_NONDOC',  100.00, 299.00, 3006.00, 18000.00),
      ('WW_EXPRESS_NONDOC',  300.00, 499.00, 3006.00, 17300.00),
      ('WW_EXPRESS_NONDOC',  500.00, 999.00, 3006.00, 17300.00),
      ('WW_EXPRESS_NONDOC', 1000.00,   NULL, 3006.00, 17300.00),

      ('WW_EXPEDITED',   21.00,  44.00, 2597.00, 15700.00),
      ('WW_EXPEDITED',   45.00,  70.00, 2597.00, 15700.00),
      ('WW_EXPEDITED',   71.00,  99.00, 2597.00, 14300.00),
      ('WW_EXPEDITED',  100.00, 299.00, 2597.00, 14300.00),
      ('WW_EXPEDITED',  300.00, 499.00, 2597.00, 13600.00),
      ('WW_EXPEDITED',  500.00, 999.00, 2597.00, 13600.00),
      ('WW_EXPEDITED', 1000.00,   NULL, 2597.00, 13600.00),

      -- WW_FLIGHT: UPS Worldwide Express Freight(수출) p.26 Zone1 열 실측치
      ('WW_FLIGHT',   71.00,  99.00, 3105.00, 17100.00),
      ('WW_FLIGHT',  100.00, 299.00, 3105.00, 17100.00),
      ('WW_FLIGHT',  300.00, 499.00, 3105.00, 16500.00),
      ('WW_FLIGHT',  500.00, 999.00, 3105.00, 16500.00),
      ('WW_FLIGHT', 1000.00,   NULL, 3105.00, 16500.00)
  )
SELECT
  p.id, z1.id, tr.tier_min_kg, tr.tier_max_kg, tr.selling_per_kg, tr.cost_per_kg, CURRENT_DATE
FROM tier_rows tr
JOIN public.zen_ups_products p ON p.product_code = tr.product_code
CROSS JOIN z1
ON CONFLICT (product_id, zone_id, tier_min_kg, valid_from) DO NOTHING;

INSERT INTO public.zen_ups_freight_minimums
  (zone_id, product_id, min_charge_selling, min_charge_cost)
SELECT
  (SELECT id FROM public.zen_ups_zones WHERE zone_code = 'Z1'),
  p.id,
  1214100.00,  -- UPS Worldwide Express Freight(수출) p.26 "최소 운임" Zone1 실측치
  220449.00
FROM public.zen_ups_products p
WHERE p.product_code = 'WW_FLIGHT'
ON CONFLICT (zone_id, product_id) DO NOTHING;

-- 검증
DO $$
DECLARE
  v_tier_count INTEGER;
  v_min_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_tier_count FROM public.zen_ups_weight_tier_rates
  WHERE zone_id = (SELECT id FROM public.zen_ups_zones WHERE zone_code = 'Z1');
  IF v_tier_count <> 26 THEN
    RAISE EXCEPTION 'Z1 weight_tier_rates 생성 건수 불일치: 기대 26건, 실제 %건', v_tier_count;
  END IF;

  SELECT COUNT(*) INTO v_min_count FROM public.zen_ups_freight_minimums
  WHERE zone_id = (SELECT id FROM public.zen_ups_zones WHERE zone_code = 'Z1');
  IF v_min_count <> 1 THEN
    RAISE EXCEPTION 'Z1 freight_minimums 생성 건수 불일치: 기대 1건, 실제 %건', v_min_count;
  END IF;

  RAISE NOTICE 'Z1 tier_rates %건, freight_minimums %건 생성 완료', v_tier_count, v_min_count;
END $$;

COMMIT;
