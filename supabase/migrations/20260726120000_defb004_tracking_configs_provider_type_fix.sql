-- DEF-B-004 (TASK-B-209): zen_tracking_configs.provider_type 값 정정
-- 기존 20260726110000 마이그레이션에서 'UPS'로 설정한 값을 'API'로 정정
-- CHECK 제약: provider_type IN ('VIRTUAL','MANUAL','API') — 'UPS'는 위반

UPDATE public.zen_tracking_configs tc
SET provider_type = 'API', provider_name = 'SHXK_UPS'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.provider_type = 'VIRTUAL';
