-- DEF-068: order_status_history SELECT RLS policy 추가
-- 발견 경로: E2E-22 일마감 Playwright 자동화 중 Server Action 500 에러 (Issue #39)
-- 근본 원인: order_status_history 테이블에 authenticated 사용자의 SELECT policy가
--            remote_schema.sql(20260428235219)에 CREATE POLICY로 존재하나
--            특정 Supabase 버전/초기화 환경에서 policy가 유실될 수 있음.
--            안전하게 IDEMPOTENT migration으로 재선언.

-- idempotent: 정책이 이미 존재하면 SKIP
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_status_history'
    AND policyname = 'Allow authenticated read for history'
  ) THEN
    CREATE POLICY "Allow authenticated read for history"
    ON public.order_status_history
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_status_history'
    AND policyname = 'Allow authenticated insert for history'
  ) THEN
    CREATE POLICY "Allow authenticated insert for history"
    ON public.order_status_history
    AS PERMISSIVE
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END;
$$;
