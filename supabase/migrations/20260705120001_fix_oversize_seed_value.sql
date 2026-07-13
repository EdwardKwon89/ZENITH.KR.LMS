-- DEF-096: OVERSIZE 부가요금 시드값 정정 (15,000/12,000원 → 69,200/55,000원)
-- An-14 §0-1 C 근거: SNTL 원자료 "대형 포장물 1C/T당 69,200원 추가요금"
-- cost_price는 기존 OC 패턴(margin ~20%)에 따라 55,000원으로 설정

UPDATE public.zen_ups_other_charges
SET
  selling_price = 69200,
  cost_price = 55000,
  updated_at = NOW()
WHERE charge_code = 'OVERSIZE'
  AND selling_price = 15000
  AND cost_price = 12000;

-- 검증
DO $$
DECLARE
  v_selling NUMERIC;
  v_cost NUMERIC;
BEGIN
  SELECT selling_price, cost_price INTO v_selling, v_cost
  FROM public.zen_ups_other_charges
  WHERE charge_code = 'OVERSIZE';

  IF v_selling IS NULL THEN
    RAISE EXCEPTION 'OVERSIZE 행을 찾을 수 없습니다.';
  END IF;

  IF v_selling <> 69200 OR v_cost <> 55000 THEN
    RAISE EXCEPTION 'OVERSIZE 값이 예상과 다릅니다: selling=%, cost=% (예상: 69200/55000)', v_selling, v_cost;
  END IF;

  RAISE NOTICE 'OVERSIZE 정정 완료: selling=%, cost=%', v_selling, v_cost;
END $$;
