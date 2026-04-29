-- WBS 3.1.2.2: 알림 관리 테이블 생성
CREATE TABLE IF NOT EXISTS zen_notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES zen_profiles(id) ON DELETE CASCADE,
  order_id   uuid        REFERENCES zen_orders(id) ON DELETE SET NULL,
  type       TEXT        NOT NULL CHECK (type IN ('STATUS_CHANGE', 'HELD', 'DELIVERED')),
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  channel    TEXT        NOT NULL CHECK (channel IN ('EMAIL', 'IN_APP')),
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zen_notifications_user_id   ON zen_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_zen_notifications_is_read   ON zen_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_zen_notifications_order_id  ON zen_notifications(order_id);

-- RLS: 본인 알림만 조회/수정 가능
ALTER TABLE zen_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON zen_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON zen_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System/Service Role은 INSERT 허용 (Server Action에서 알림 생성)
CREATE POLICY "Service role can insert notifications"
  ON zen_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ZENITH_SUPER_ADMIN can view all notifications"
  ON zen_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM zen_profiles
      WHERE id = auth.uid() AND role = 'ZENITH_SUPER_ADMIN'
    )
  );
