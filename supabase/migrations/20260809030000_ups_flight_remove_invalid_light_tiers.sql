BEGIN;
-- WW_FLIGHT(Freight)의 무의미한 21-44/45-70kg 구간(weight_tier_rates) 삭제
--
-- 발견 경위: 2026-08-09 판매가 반영 작업 중 확인 — 원 시드(20260705140000_imp146_ups_tier_dwb_freight_min.sql)가
--   6개 상품(WW_EXPRESS_DOC/NONDOC, WW_SAVER_DOC/NONDOC, WW_EXPEDITED, WW_FLIGHT) 전체에 동일한
--   7구간(21-44/45-70/71-99/100-299/300-499/500-999/1000+)을 일괄 생성했음. 그러나 실제 UPS
--   Worldwide Express Freight(WWEF)는 "70 kg 초과 팔레트 포장 발송물" 전용 서비스로, UPS 공식 원가표
--   (UPS_원가표.pdf)와 판매가 표(UPS 운임 및 부가서비스.pdf p.26) 모두 71kg 미만 구간 자체가 존재하지
--   않음 — 즉 21-44/45-70 구간은 처음부터 실측 데이터가 없는 더미(placeholder)였고, 실제로도 발생할 수
--   없는 중량 구간(Freight 주문은 70kg 초과만 유효)이라 애플리케이션에서 조회될 일이 없는 죽은 데이터.
--
-- 조치: WW_FLIGHT의 tier_min_kg IN (21, 45) 행 삭제(Zone 2~10, 총 18건 — Zone 1은 20260809000000에서
--   애초에 5구간만 생성해 해당 없음). 71kg 이상 5개 구간(원가·판매가 모두 실측치 반영 완료)은 그대로 유지.

DELETE FROM public.zen_ups_weight_tier_rates
WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT')
  AND tier_min_kg IN (21.00, 45.00);

-- 검증
DO $$
DECLARE
  v_remaining INTEGER;
  v_total     INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining FROM public.zen_ups_weight_tier_rates
  WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT')
    AND tier_min_kg IN (21.00, 45.00);
  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'WW_FLIGHT 21/45kg 구간 삭제 실패: %건 잔존', v_remaining;
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.zen_ups_weight_tier_rates
  WHERE product_id = (SELECT id FROM public.zen_ups_products WHERE product_code = 'WW_FLIGHT');
  IF v_total <> 50 THEN
    RAISE EXCEPTION 'WW_FLIGHT weight_tier_rates 최종 건수 불일치: 기대 50(Zone1~10 × 5구간), 실제 %', v_total;
  END IF;

  RAISE NOTICE 'WW_FLIGHT 무의미 구간 정리 완료, 최종 %건(71kg 이상 구간만)', v_total;
END $$;

COMMIT;
