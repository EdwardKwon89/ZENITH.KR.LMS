-- IMP-158: UPS 20kg 초과 per-kg 요율 데이터 결함 2건 수정
-- 근거 문서: docs/80_RawData/20260609 SNTL 자료/UPS 운임 및 부가서비스.pdf (p.19 Saver 비서류, p.20 Expedited 비서류)
--
-- ① WW_SAVER_NONDOC, Zone 2~10, tier_min_kg IN (500, 1000): price_per_kg_selling이 같은 Zone의
--    300-499 구간 대비 약 1/60 수준으로 저장되어 있던 원본 시드 데이터 결함(원인 이전 마이그레이션 불명,
--    20260719000200는 weight_tier_rates를 건드리지 않았음 — scratch/post_launch_improvements.md IMP-158 참조).
--    PDF는 300kg 이상을 단일 구간("300 and above")으로 취급하므로 300-499 = 500-999 = 1000+ 여야 정상.
--    Zone 1은 20260809000000에서 이미 정상값으로 재작성되어 있어 이번 대상에서 제외.
--
-- ② WW_EXPEDITED, Zone 5, tier_min_kg=45(45-70kg): 20260809020000 마이그레이션(858/867행)에서
--    21-44 구간값(28,500)을 45-70 구간에도 그대로 복붙 — PDF 원본 45-70 구간은 28,200으로 서로 다름
--    (다른 모든 Zone·상품은 두 구간이 항상 동일해서 지금까지 드러나지 않았던 자체 오기).

-- ① WW_SAVER_NONDOC 500kg+ 구간 판매가 정정 (Zone별 300-499 값과 동일하게)
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 17300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 19400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 26500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 29200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 42000 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 43300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 61600 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 61700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND tier_min_kg IN (500, 1000);
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 16500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_NONDOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND tier_min_kg IN (500, 1000);

-- ② WW_EXPEDITED Zone5 45-70kg 구간 판매가 정정 (28,500 → 28,200)
UPDATE zen_ups_weight_tier_rates SET price_per_kg_selling = 28200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_EXPEDITED') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND tier_min_kg = 45;

-- 검증 DO-block
DO $$
DECLARE
  v_bad_saver_count INT;
  v_bad_expedited INT;
BEGIN
  -- ① WW_SAVER_NONDOC: Zone2~10에서 300-499/500-999/1000+ 판매가가 서로 다른 행이 없어야 함
  SELECT COUNT(*) INTO v_bad_saver_count
  FROM (
    SELECT z.zone_code, t.tier_min_kg, t.price_per_kg_selling,
           FIRST_VALUE(t.price_per_kg_selling) OVER (PARTITION BY z.zone_code ORDER BY t.tier_min_kg) AS base_price
    FROM zen_ups_weight_tier_rates t
    JOIN zen_ups_products p ON p.id = t.product_id
    JOIN zen_ups_zones z ON z.id = t.zone_id
    WHERE p.product_code = 'WW_SAVER_NONDOC' AND t.is_active = TRUE AND t.tier_min_kg >= 300
  ) x
  WHERE x.price_per_kg_selling <> x.base_price;

  IF v_bad_saver_count <> 0 THEN
    RAISE EXCEPTION 'IMP-158 검증 실패: WW_SAVER_NONDOC 300kg 이상 구간 판매가 불일치 % 건', v_bad_saver_count;
  END IF;

  -- ② WW_EXPEDITED Zone5 45-70kg
  SELECT COUNT(*) INTO v_bad_expedited
  FROM zen_ups_weight_tier_rates t
  JOIN zen_ups_products p ON p.id = t.product_id
  JOIN zen_ups_zones z ON z.id = t.zone_id
  WHERE p.product_code = 'WW_EXPEDITED' AND z.zone_code = 'Z5' AND t.tier_min_kg = 45
    AND t.is_active = TRUE AND t.price_per_kg_selling = 28200;

  IF v_bad_expedited <> 1 THEN
    RAISE EXCEPTION 'IMP-158 검증 실패: WW_EXPEDITED Zone5 45-70kg 정정값 미반영';
  END IF;

  RAISE NOTICE 'IMP-158 검증 통과: SAVER_NONDOC 300kg+ 전 Zone 일치, EXPEDITED Z5 45-70kg 정정 확인';
END $$;
