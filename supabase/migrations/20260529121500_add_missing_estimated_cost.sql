-- DEF-022: create_order_atomic RPC INSERT 대상 컬럼 중 누락: estimated_cost
ALTER TABLE public.zen_orders ADD COLUMN IF NOT EXISTS estimated_cost numeric;

COMMENT ON COLUMN public.zen_orders.estimated_cost IS '예상 운임 (폼 제출 시 자동 계산)';
