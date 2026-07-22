-- Issue #695: UPS접수취소 시 zen_ups_labels/zen_ups_label_documents/Storage 파일 정리 누락
-- 1) FK SET NULL → CASCADE (zen_ups_label_documents.label_id)
-- 2) AGENCY DELETE 정책 추가 (zen_ups_labels + label_documents + storage)

-- 1. FK 변경: ON DELETE SET NULL → ON DELETE CASCADE
ALTER TABLE public.zen_ups_label_documents
  DROP CONSTRAINT IF EXISTS zen_ups_label_documents_label_id_fkey;

ALTER TABLE public.zen_ups_label_documents
  ADD CONSTRAINT zen_ups_label_documents_label_id_fkey
  FOREIGN KEY (label_id) REFERENCES public.zen_ups_labels(id) ON DELETE CASCADE;

-- 2. zen_ups_labels AGENCY DELETE 정책 (cancelUpsRegistration 대상 테이블)
CREATE POLICY "ups_labels_agency_delete"
  ON public.zen_ups_labels FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'AGENCY'
    AND EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE zen_orders.id = zen_ups_labels.order_id
        AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    )
  );

-- 3. zen_ups_label_documents AGENCY DELETE 정책
CREATE POLICY "ups_label_docs_agency_delete"
  ON public.zen_ups_label_documents FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() = 'AGENCY'
    AND EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE zen_orders.id = zen_ups_label_documents.order_id
        AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    )
  );

-- 4. invoices 버킷 AGENCY DELETE 정책 (Storage 파일 삭제)
CREATE POLICY "Allow agency to delete ups labels"
ON storage.objects FOR DELETE
TO authenticated
USING (
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
