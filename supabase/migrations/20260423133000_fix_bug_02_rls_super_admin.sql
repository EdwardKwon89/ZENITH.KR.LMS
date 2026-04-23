-- BUG-02: RLS 정책에 ZENITH_SUPER_ADMIN role 포함
-- 작성일: 2026-04-23

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'zen_tracking_raw_logs' 
        AND policyname = 'Super admins have full access to tracking raw logs'
    ) THEN
        CREATE POLICY "Super admins have full access to tracking raw logs"
          ON public.zen_tracking_raw_logs FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.zen_profiles
              WHERE id = auth.uid() AND role = 'ZENITH_SUPER_ADMIN'
            )
          );
    END IF;
END $$;
