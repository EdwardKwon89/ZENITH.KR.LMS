-- DEF-B-059 / Issue #1079: 오더 화주 주소 영문 컬럼 추가
-- zen_orders에 shipper_address_english, shipper_address_detail_english 컬럼 추가

ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS shipper_address_english text,
  ADD COLUMN IF NOT EXISTS shipper_address_detail_english text;

COMMENT ON COLUMN public.zen_orders.shipper_address_english IS '화주 영문 주소 (Daum 우편번호에서 자동 채움)';
COMMENT ON COLUMN public.zen_orders.shipper_address_detail_english IS '화주 영문 상세주소';
