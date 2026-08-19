-- TASK-B-305 (Issue #1133): 수하인 상세주소 영문 전용 컬럼 추가 (DEF-B-134)
-- zen_orders에 recipient_address_detail 컬럼 추가

ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS recipient_address_detail text;

COMMENT ON COLUMN public.zen_orders.recipient_address_detail IS '수하인 영문 상세주소 (영문 전용 입력)';
