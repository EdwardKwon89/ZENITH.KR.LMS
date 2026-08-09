BEGIN;
-- WW_EXPRESS_DOC/WW_SAVER_DOC(서류) 5kg 초과 더미행 정리 + WW_SAVER_DOC 2~5kg 판매가 실측 보강
--
-- 발견 경위(2026-08-09, JSJung 확인 요청): "UPS Worldwide Express(서류)" 화면 조회 중
--   ①5kg 초과 중량에서 원가 39,200원/판매가 49,000원(7kg) 같은 근거 없는 값이 표시되는 것을 발견.
--   확인 결과 최초 UAT 더미 시드(0.5~30kg 16개 포인트, 6개 상품 일괄 생성)가 WW_EXPRESS_DOC/
--   WW_SAVER_DOC의 7/10/15/20/25/30kg에 그대로 남아있었음 — UPS 공식 요율표(UPS_원가표.pdf,
--   UPS 운임 및 부가서비스.pdf) 모두 서류(DOC) 상품은 5kg까지만 존재("5.0kg 초과 서류는 비서류
--   요금표 참조") — 실제로는 존재하지 않는 중량 구간에 가짜 요금이 조회되고 있던 상태.
--   ②추가로 WW_SAVER_DOC는 2.0~5.0kg 구간도 원가는 실측(07-19 반영)이나 판매가는 더미로
--   남아있어 원가(예: Z1/5kg 80,176원)가 판매가(더미 30,000원)보다 큰 역마진 상태였음
--   (20260719000200 마이그레이션 주석에 "Doc는 0.5/1/1.5kg만 존재 → 더미값 유지"로 이미
--   문서화된 gap — 이번에 UPS 운임 및 부가서비스.pdf p.18 실측치로 보강).
--
-- 조치: ①두 상품의 5kg 초과 행 전량 삭제 ②zen_ups_products.max_weight_kg=5 설정
--   (freight.ts에 이미 이 컬럼 기준 명시적 차단 로직 추가 완료 — 5kg 초과 시 안내 메시지와
--   함께 에러) ③WW_SAVER_DOC 2.0~5.0kg 판매가 실측치 반영.

DELETE FROM zen_ups_base_rates
WHERE product_id IN (SELECT id FROM zen_ups_products WHERE product_code IN ('WW_EXPRESS_DOC', 'WW_SAVER_DOC'))
  AND weight_kg > 5.0;

UPDATE zen_ups_products SET max_weight_kg = 5
WHERE product_code IN ('WW_EXPRESS_DOC', 'WW_SAVER_DOC');

-- WW_SAVER_DOC 2.0~5.0kg 판매가 실측 반영 (기존 행 존재 확인됨, cost_price는 이미 실측치라 미변경)
UPDATE zen_ups_base_rates SET selling_price = 130200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 133200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 137100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 152100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 180700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 184200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 203200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 247400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 255400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 125700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 2;
UPDATE zen_ups_base_rates SET selling_price = 158300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 162400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 166200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 182900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 219400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 227500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 250400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 304200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 305100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 152900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 2.5;
UPDATE zen_ups_base_rates SET selling_price = 171300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 180500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 186200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 210400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 239500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 248600 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 274700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 340400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 343700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 165500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 3;
UPDATE zen_ups_base_rates SET selling_price = 182200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 194000 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 204700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 233200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 253900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 270300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 294800 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 377100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 384100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 175700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 3.5;
UPDATE zen_ups_base_rates SET selling_price = 194900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 205700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 222000 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 251500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 268500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 291500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 314900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 411300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 421800 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 188100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 4;
UPDATE zen_ups_base_rates SET selling_price = 202900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 215500 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 233300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 267600 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 286400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 312700 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 335200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 441600 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 460800 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 196000 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 4.5;
UPDATE zen_ups_base_rates SET selling_price = 209400 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z1') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 225200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z2') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 244600 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z3') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 284300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z4') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 301200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z5') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 333900 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z6') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 355100 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z7') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 472200 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z8') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 501000 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z9') AND weight_kg = 5;
UPDATE zen_ups_base_rates SET selling_price = 202300 WHERE is_active = TRUE AND product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC') AND zone_id = (SELECT id FROM zen_ups_zones WHERE zone_code='Z10') AND weight_kg = 5;

-- 검증
DO $$
DECLARE
  v_leftover INTEGER;
  v_saver_gap INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_leftover FROM zen_ups_base_rates
  WHERE product_id IN (SELECT id FROM zen_ups_products WHERE product_code IN ('WW_EXPRESS_DOC', 'WW_SAVER_DOC'))
    AND weight_kg > 5.0;
  IF v_leftover <> 0 THEN
    RAISE EXCEPTION 'WW_EXPRESS_DOC/WW_SAVER_DOC 5kg 초과 더미행 삭제 실패: %건 잔존', v_leftover;
  END IF;

  SELECT COUNT(*) INTO v_saver_gap FROM zen_ups_base_rates
  WHERE product_id = (SELECT id FROM zen_ups_products WHERE product_code='WW_SAVER_DOC')
    AND weight_kg BETWEEN 2.0 AND 5.0 AND selling_price < cost_price;
  IF v_saver_gap <> 0 THEN
    RAISE EXCEPTION 'WW_SAVER_DOC 2~5kg 판매가<원가(역마진) %건 잔존', v_saver_gap;
  END IF;

  RAISE NOTICE 'WW_EXPRESS_DOC/WW_SAVER_DOC 서류 5kg 상한 정리 완료';
END $$;

COMMIT;
