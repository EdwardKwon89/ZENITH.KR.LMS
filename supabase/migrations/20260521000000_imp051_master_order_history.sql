-- IMP-051: Master Order History Table
-- Tracks all status changes and dissolve events for master orders.

CREATE TABLE IF NOT EXISTS zen_master_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_order_id UUID NOT NULL REFERENCES zen_master_orders(id) ON DELETE CASCADE,
  prev_status VARCHAR(50),
  next_status VARCHAR(50) NOT NULL,
  reason TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_master_order_history_master_id ON zen_master_order_history(master_order_id);
CREATE INDEX idx_master_order_history_created_at ON zen_master_order_history(created_at DESC);
