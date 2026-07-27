-- ISSUE-851 / TASK-B-207: UPS 오더의 zen_tracking_configs.provider_type 백필
-- 기존 UPS 오더 중 provider_type이 'VIRTUAL'인 건을 'UPS'로 갱신

UPDATE public.zen_tracking_configs tc
SET provider_type = 'UPS', provider_name = 'UPS Express'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.provider_type = 'VIRTUAL';
