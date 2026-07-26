-- DEF-B-004 (TASK-B-209): zen_tracking_configs.provider_type 값 정정
-- 기존 20260726110000 마이그레이션에서 'UPS'로 설정하려 했으나 CHECK 제약 위반으로 실패한 값을 정정
-- CHECK 제약: provider_type IN ('VIRTUAL','MANUAL','API') — 'UPS'는 위반
-- UPS 오더는 별도 트래킹 파이프라인(zen_ups_tracking_events) 사용 → 'MANUAL'로 설정하여 Mock 트리거 차단

UPDATE public.zen_tracking_configs tc
SET provider_type = 'MANUAL', provider_name = 'MANUAL'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.provider_type IN ('VIRTUAL', 'UPS');
