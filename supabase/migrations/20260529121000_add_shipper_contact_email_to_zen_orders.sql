-- DEF-022: zen_orders에 shipper_contact_email 컬럼 추가
-- create_order_atomic RPC가 shipper_contact_email을 INSERT하지만
-- 해당 컬럼이 존재하지 않아 "column does not exist" 오류 발생
ALTER TABLE public.zen_orders ADD COLUMN IF NOT EXISTS shipper_contact_email text;

COMMENT ON COLUMN public.zen_orders.shipper_contact_email IS '송하인 담당자 이메일 (참조용)';
