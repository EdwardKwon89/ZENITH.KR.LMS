-- DEF-B-024: 화주 본인 UPS 오더 등록 시 tracking_no 가짜값 정리 (서비스 롤 적용)
-- DEF-B-007 백필과 동일 패턴 — 재발한 행까지 다시 정리

UPDATE public.zen_tracking_configs tc
SET tracking_no = NULL,
    provider_type = 'MANUAL',
    provider_name = 'MANUAL'
FROM public.zen_orders o
WHERE tc.order_id = o.id
  AND o.transport_mode = 'UPS'
  AND tc.tracking_no LIKE 'ZN-%';
