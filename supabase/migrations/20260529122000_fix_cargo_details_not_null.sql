-- DEF-022: create_order_atomic RPC가 cargo_details를 INSERT하지 않으므로
-- NOT NULL 위반 방지를 위해 기본값 설정
ALTER TABLE public.zen_orders ALTER COLUMN cargo_details SET DEFAULT '{}'::jsonb;
