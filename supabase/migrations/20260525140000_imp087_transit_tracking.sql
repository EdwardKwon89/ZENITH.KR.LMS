-- IMP-087: 환적 상태 추적 A안 — Transit Tracking per Leg
-- zen_tracking_events에 segment_index, hub_port_code 컬럼 추가
-- TRANSIT_* 이벤트 타입 지원 (DB 제약은 애플리케이션 레벨)

ALTER TABLE public.zen_tracking_events
  ADD COLUMN segment_index INTEGER,
  ADD COLUMN hub_port_code TEXT;

COMMENT ON COLUMN public.zen_tracking_events.segment_index IS '레그 번호 (0-based) — 몇 번째 구간인지 표시. DIRECT=0, HUB=0(leg1)/1(leg2)';
COMMENT ON COLUMN public.zen_tracking_events.hub_port_code IS '환적 발생 포트 코드 — TRANSIT_ARRIVED_HUB/TRANSIT_DEPARTED_HUB 이벤트의 경유지 식별';

CREATE INDEX IF NOT EXISTS idx_tracking_events_segment
  ON public.zen_tracking_events (order_id, segment_index);
