-- Fix: zen_ups_labels RLS 누락 - authenticated SELECT 및 Admin ALL 추가

CREATE POLICY "ups_labels_admin_all"
  ON public.zen_ups_labels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid()
        AND role IN ('ADMIN','MANAGER','ZENITH_SUPER_ADMIN')
    )
  );

CREATE POLICY "ups_labels_authenticated_select"
  ON public.zen_ups_labels FOR SELECT
  TO authenticated
  USING (true);
