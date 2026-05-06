-- Fix customs_declarations RLS to use zen_profiles instead of profiles
DROP POLICY IF EXISTS "Allow all access for admin on customs_declarations" ON customs_declarations;

CREATE POLICY "Allow all access for admin on customs_declarations"
  ON customs_declarations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zen_profiles
      WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'ZENITH_SUPER_ADMIN')
    )
  );
