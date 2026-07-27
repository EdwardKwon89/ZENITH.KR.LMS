-- DEF-B-007: UPS 오더 tracking_no 가짜 값("ZN-" 접두사) 정리
-- 기존 UPS 오더 중 tracking_no가 'ZN-' 접두사인 행을 NULL로 백필

UPDATE public.zen_tracking_configs tc
SET tracking_no = NULL
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.tracking_no LIKE 'ZN-%';
