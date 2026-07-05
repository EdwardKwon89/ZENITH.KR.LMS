-- TASK-B-059 §3: zen_order_rate_snapshots 테이블 생성
CREATE TABLE IF NOT EXISTS zen_order_rate_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES zen_orders(id) ON DELETE CASCADE,
  platform_price  numeric(12,2) NOT NULL,
  agency_price    numeric(12,2) NOT NULL,
  shipper_price   numeric(12,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  snapshot_data   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE zen_order_rate_snapshots IS '오더 생성 시 estimateUpsFreight 결과 스냅샷 (TASK-B-059)';
COMMENT ON COLUMN zen_order_rate_snapshots.snapshot_data IS 'estimateUpsFreight 전체 응답 (Platform/Agency/Shipper 3단계)';

CREATE INDEX IF NOT EXISTS idx_order_rate_snapshots_order_id ON zen_order_rate_snapshots(order_id);
