-- Create zen_rate_limits table
CREATE TABLE zen_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar NOT NULL, -- "ip:action" format identifier
  window_start timestamp with time zone NOT NULL,
  request_count integer DEFAULT 1,
  UNIQUE(key, window_start)
);

-- Enable Row Level Security (No policies means block all direct accesses, access only via RPC security definer)
ALTER TABLE zen_rate_limits ENABLE ROW LEVEL SECURITY;

-- Index for window clean-up and count operations
CREATE INDEX idx_rate_limits_key_window ON zen_rate_limits(key, window_start);

-- RPC Function for checking rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key varchar,
  p_window_size_seconds integer,
  p_max_requests integer
) RETURNS jsonb AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_window_start timestamp with time zone;
  v_current_count integer;
  v_limit_exceeded boolean := false;
  v_retry_after integer := 0;
BEGIN
  -- Align current timestamp to window bucket size
  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_size_seconds) * p_window_size_seconds);
  
  -- Clean up old entries to prevent infinite growth
  DELETE FROM zen_rate_limits 
  WHERE window_start < (v_now - (p_window_size_seconds * 2) * interval '1 second');

  -- Upsert current request count
  INSERT INTO zen_rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = zen_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Verify limits
  IF v_current_count > p_max_requests THEN
    v_limit_exceeded := true;
    v_retry_after := p_window_size_seconds - (extract(epoch from v_now)::integer % p_window_size_seconds);
  END IF;

  RETURN jsonb_build_object(
    'allowed', NOT v_limit_exceeded,
    'current', v_current_count,
    'retry_after', v_retry_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
