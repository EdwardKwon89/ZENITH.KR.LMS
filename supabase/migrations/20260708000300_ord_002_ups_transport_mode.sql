-- TASK-B-079: zen_orders.transport_mode CHECK에 'UPS' 추가
ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_transport_mode_check;
ALTER TABLE public.zen_orders ADD CONSTRAINT zen_orders_transport_mode_check
  CHECK (transport_mode IN ('AIR', 'SEA', 'EXP', 'LAND', 'UPS'));
