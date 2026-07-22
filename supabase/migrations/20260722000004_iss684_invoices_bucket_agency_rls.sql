-- Issue #684: invoices 버킷 RLS에 AGENCY 역할 추가
-- 기존 정책은 ADMIN/PARTNER만 업로드 허용 — AGENCY도 UPS 라벨 업로드 필요
-- 기존 정책은 그대로 유지하고 AGENCY용 정책만 추가

-- AGENCY 업로드 허용 (ups-labels/{order_id}/ 경로 — 실제 본인 소속 오더만)
CREATE POLICY "Allow agency to upload ups labels"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND storage.objects.name LIKE 'ups-labels/%'
  AND EXISTS (
    SELECT 1 FROM public.zen_profiles p
    JOIN public.zen_orders o ON o.agency_org_id = p.org_id
    WHERE p.id = auth.uid()
      AND p.role = 'AGENCY'
      AND o.id = (storage.foldername(name))[2]::uuid
  )
);

-- AGENCY 조회 허용 (본인 소속 agency_org_id 오더 문서만)
CREATE POLICY "Allow agency to view ups labels"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND storage.objects.name LIKE 'ups-labels/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      JOIN public.zen_orders o ON o.agency_org_id = p.org_id
      WHERE p.id = auth.uid()
        AND p.role = 'AGENCY'
        AND o.id = (storage.foldername(name))[2]::uuid
    )
    OR EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
    )
  )
);
