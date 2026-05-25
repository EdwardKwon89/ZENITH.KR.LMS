-- IMP-085: Order-Route Segment 연결
-- zen_orders ↔ 선택된 경로 세그먼트 관계 추가
-- 설계 방안 A': route_option_id FK + 기존 zen_order_routes bridge 활용

-- 1. zen_orders에 route_option_id FK 추가
ALTER TABLE zen_orders
  ADD COLUMN route_option_id UUID REFERENCES zen_route_options(id) ON DELETE SET NULL;

CREATE INDEX idx_zen_orders_route_option_id ON zen_orders(route_option_id);

COMMENT ON COLUMN zen_orders.route_option_id IS '선택된 경로 옵션 ID (방안 A'). selectRoute()에서 zen_order_routes upsert와 함께 UPDATE됨';

-- 2. RLS: zen_orders 기존 RLS 정책에 신규 컬럼 자동 포함
-- Row-Level Security는 컬럼 단위가 아닌 ROW 단위이므로 별도 RLS 정책 추가 불필요
-- (zen_orders의 기존 SELECT/INSERT/UPDATE 정책이 route_option_id 컬럼에도 적용됨)

-- 3. zen_order_route_summary View: TASK-093 downstream 편의
CREATE OR REPLACE VIEW zen_order_route_summary
WITH (security_invoker=on)
AS
SELECT
  o.id AS order_id,
  o.order_no,
  o.route_option_id,
  ro.option_type,
  ro.segments,
  ro.total_cost,
  ro.total_transit_days,
  ro.score,
  op.name AS origin_port_name,
  dp.name AS dest_port_name
FROM zen_orders o
LEFT JOIN zen_route_options ro ON ro.id = o.route_option_id
LEFT JOIN zen_ports op ON op.id = o.origin_port_id
LEFT JOIN zen_ports dp ON dp.id = o.dest_port_id;

COMMENT ON VIEW zen_order_route_summary IS '오더별 선택된 경로 요약 (JOIN 선처리). TASK-093 환적 상태 추적에서 사용';
