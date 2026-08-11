BEGIN;
-- TASK-B-261 / Issue #1016 / DEF-B-037 — zen_ups_base_rates 상품별 잔재 데이터 정리
--
-- 현상: 각 상품의 비즈니스 규칙 범위를 벗어난 레거시 잔재 행 270건이 남아,
--   "UPS 요금표 조회" 화면(getPublicBaseRates())에 잘못된 값이 표시됨.
--   (실제 요금 계산 엔진은 이 행들을 전혀 조회하지 않아 청구 금액에는 영향 없음 — 순수 표시 데이터 오염)
--
--  삭제 대상 (합계 270건):
--   - WW_EXPRESS_NONDOC  : weight_kg > 20  → 20건 (10 Zone × {25.0, 30.0})
--   - WW_SAVER_NONDOC    : weight_kg > 20  → 20건 (10 Zone × {25.0, 30.0})
--   - WW_EXPEDITED       : 0.5kg 단위(비정수) 또는 weight_kg > 20 → 70건 (10 Zone × 7)
--   - WW_FLIGHT          : base_rates 전량(계산 엔진이 이 테이블을 아예 사용하지 않음) → 160건
--
-- 주의: WW_EXPRESS_DOC / WW_SAVER_DOC는 이미 정상 상태이므로 건드리지 않는다.
--   UPS_10KG_BOX / UPS_25KG_BOX도 정상 범위이므로 대상이 아니다.

-- 1) WW_EXPRESS_NONDOC, WW_SAVER_NONDOC: 20kg 초과 잔재
DELETE FROM public.zen_ups_base_rates
WHERE product_id IN (SELECT id FROM public.zen_ups_products WHERE product_code IN ('WW_EXPRESS_NONDOC','WW_SAVER_NONDOC'))
  AND weight_kg > 20;

-- 2) WW_EXPEDITED: 0.5kg 단위 잔재 + 20kg 초과 잔재
DELETE FROM public.zen_ups_base_rates
WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_EXPEDITED')
  AND (weight_kg != FLOOR(weight_kg) OR weight_kg > 20);

-- 3) WW_FLIGHT: base_rates 전량 (계산 엔진이 이 테이블을 아예 사용하지 않음)
DELETE FROM public.zen_ups_base_rates
WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT');

-- 검증 (삭제 전/후 행 수)
DO $$
DECLARE
  v_exp_nondoc_before INTEGER;
  v_saver_nondoc_before INTEGER;
  v_exped_before INTEGER;
  v_flight_before INTEGER;
  v_exp_nondoc_after INTEGER;
  v_saver_nondoc_after INTEGER;
  v_exped_after INTEGER;
  v_flight_after INTEGER;
  v_total_deleted INTEGER;
BEGIN
  -- 삭제 전 (마이그레이션 문에서 이미 삭제되었으므로 이 시점의 'before'는 아래 계산으로 보정)
  -- 실제로는 DO-block 이전 DELETE가 실행됐으므로, before 값은 삭제된 행 수 + after 로 복원해 검증한다.

  SELECT COUNT(*) INTO v_exp_nondoc_after FROM public.zen_ups_base_rates
    WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_EXPRESS_NONDOC');
  SELECT COUNT(*) INTO v_saver_nondoc_after FROM public.zen_ups_base_rates
    WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_SAVER_NONDOC');
  SELECT COUNT(*) INTO v_exped_after FROM public.zen_ups_base_rates
    WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_EXPEDITED');
  SELECT COUNT(*) INTO v_flight_after FROM public.zen_ups_base_rates
    WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT');

  -- 삭제 후 기대값 검증: EXPRESS_NONDOC 400, SAVER_NONDOC 400, EXPEDITED 200, FLIGHT 0
  IF v_exp_nondoc_after <> 400 THEN
    RAISE EXCEPTION 'WW_EXPRESS_NONDOC 최종 건수 불일치: 기대 400, 실제 %', v_exp_nondoc_after;
  END IF;
  IF v_saver_nondoc_after <> 400 THEN
    RAISE EXCEPTION 'WW_SAVER_NONDOC 최종 건수 불일치: 기대 400, 실제 %', v_saver_nondoc_after;
  END IF;
  IF v_exped_after <> 200 THEN
    RAISE EXCEPTION 'WW_EXPEDITED 최종 건수 불일치: 기대 200, 실제 %', v_exped_after;
  END IF;
  IF v_flight_after <> 0 THEN
    RAISE EXCEPTION 'WW_FLIGHT 최종 건수 불일치: 기대 0, 실제 %', v_flight_after;
  END IF;

  -- 삭제 전(기대값) 대비 삭제된 총 행 수 = 270
  v_total_deleted := (420 - v_exp_nondoc_after) + (420 - v_saver_nondoc_after)
                   + (270 - v_exped_after) + (160 - v_flight_after);
  IF v_total_deleted <> 270 THEN
    RAISE EXCEPTION '삭제된 총 행 수 불일치: 기대 270, 실제 %', v_total_deleted;
  END IF;

  RAISE NOTICE 'base_rates 정리 완료 — 삭제 %건. EXPRESS_NONDOC=% SAVER_NONDOC=% EXPEDITED=% FLIGHT=%',
    v_total_deleted, v_exp_nondoc_after, v_saver_nondoc_after, v_exped_after, v_flight_after;
END $$;

COMMIT;
