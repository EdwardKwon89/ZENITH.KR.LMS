-- TASK-B-346 (Issue #1278): 수하인 회사명 전용 컬럼 추가
-- SHXK createorder `consignee.consignee_company`(수취인 회사명, 200자 선택) 전송용.

ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS recipient_company text;

COMMENT ON COLUMN public.zen_orders.recipient_company IS '수하인 회사명 (SHXK consignee_company 매핑, 최대 200자)';
