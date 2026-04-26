-- BUG-TRK-DUP-CONFIG: zen_tracking_configs.order_id UNIQUE 제약 추가
-- 문제: syncExternalTracking 동시 실행 시 중복 config 생성 → .single() 실패
-- 영향: getTrackingEvents()가 "No config found" 반환, 타임라인 미표시
-- 작성일: 2026-04-26

-- 중복 제거: order_id별 가장 오래된 레코드만 보존
DELETE FROM public.zen_tracking_configs
WHERE id NOT IN (
  SELECT DISTINCT ON (order_id) id
  FROM public.zen_tracking_configs
  ORDER BY order_id, created_at ASC
);

-- UNIQUE 제약 추가
ALTER TABLE public.zen_tracking_configs
  ADD CONSTRAINT zen_tracking_configs_order_id_unique UNIQUE (order_id);
