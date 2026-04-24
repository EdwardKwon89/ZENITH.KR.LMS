-- NOTIF-01 회귀 테스트 수정: zen_tracking_raw_logs INSERT 정책 추가
-- 시스템(Server Action/Cron)이 서비스 롤 없이도 INSERT 가능하도록 허용
-- SELECT는 기존 ADMIN/ZENITH_SUPER_ADMIN 정책 유지

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'zen_tracking_raw_logs'
      AND policyname = 'System can insert tracking raw logs'
  ) THEN
    CREATE POLICY "System can insert tracking raw logs"
      ON public.zen_tracking_raw_logs
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
