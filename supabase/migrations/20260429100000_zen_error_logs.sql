-- Create zen_error_logs table for system monitoring
CREATE TABLE IF NOT EXISTS zen_error_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type  TEXT NOT NULL,          -- 'CLIENT' | 'SERVER' | 'EDGE'
  message     TEXT NOT NULL,
  stack       TEXT,
  url         TEXT,
  user_id     uuid REFERENCES profiles(id),
  org_id      uuid REFERENCES zen_organizations(id),
  severity    TEXT NOT NULL DEFAULT 'ERROR' CHECK (severity IN ('WARNING','ERROR','CRITICAL')),
  resolved    BOOLEAN NOT NULL DEFAULT false,
  sentry_id   TEXT,                   -- Sentry event ID (optional)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE zen_error_logs ENABLE ROW LEVEL SECURITY;

-- 1. Admin/SuperAdmin has full access
CREATE POLICY "Admin full access on zen_error_logs"
ON zen_error_logs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'ADMIN' OR profiles.role = 'ZENITH_SUPER_ADMIN')
  )
);

-- 2. Authenticated users can insert logs (for client-side error reporting)
CREATE POLICY "Users can insert zen_error_logs"
ON zen_error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE zen_error_logs IS 'System error logs for monitoring and debugging';
COMMENT ON COLUMN zen_error_logs.error_type IS 'Source of the error: CLIENT, SERVER, or EDGE';
COMMENT ON COLUMN zen_error_logs.severity IS 'Importance level: WARNING, ERROR, or CRITICAL';
