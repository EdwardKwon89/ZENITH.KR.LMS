-- Issue #684: UPS 라벨/무역서류 실제 다운로드 후 자체 스토리지 저장 (다중 문서 지원)
-- zen_ups_label_documents: SHXK에서 받은 외부 URL PDF를 다운로드하여 자체 스토리지에 보관

CREATE TABLE IF NOT EXISTS public.zen_ups_label_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  label_id         UUID REFERENCES public.zen_ups_labels(id) ON DELETE SET NULL,
  reference_no     TEXT NOT NULL,
  content_type     TEXT NOT NULL,          -- SHXK lable_content_type 원본 ('1','2','3','4','6')
  doc_type         TEXT NOT NULL,          -- 내부 분류 ('WAYBILL','CUSTOMS','INVOICE','COMBINED')
  storage_path     TEXT NOT NULL,          -- Supabase Storage 내부 경로
  original_url     TEXT,                   -- SHXK 외부 URL (참고용)
  file_size_bytes  INTEGER,
  label_format     TEXT DEFAULT 'PDF',
  downloaded_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ups_label_docs_order_id ON public.zen_ups_label_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_ups_label_docs_label_id ON public.zen_ups_label_documents(label_id);
CREATE INDEX IF NOT EXISTS idx_ups_label_docs_ref_no ON public.zen_ups_label_documents(reference_no);

ALTER TABLE public.zen_ups_label_documents ENABLE ROW LEVEL SECURITY;

-- 1. ADMIN/MANAGER/ZENITH_SUPER_ADMIN: ALL
CREATE POLICY "ups_label_docs_admin_all"
  ON public.zen_ups_label_documents FOR ALL
  TO authenticated
  USING (
    public.get_my_role() IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
  );

-- 2. SHIPPER: own org orders
CREATE POLICY "ups_label_docs_shipper_select"
  ON public.zen_ups_label_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE zen_orders.id = zen_ups_label_documents.order_id
        AND public.is_org_member(auth.uid(), zen_orders.shipper_id)
    )
  );

CREATE POLICY "ups_label_docs_shipper_insert"
  ON public.zen_ups_label_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE zen_orders.id = zen_ups_label_documents.order_id
        AND public.is_org_member(auth.uid(), zen_orders.shipper_id)
    )
  );

-- 3. AGENCY: agency_org_id 기반 SELECT/INSERT (DEF-114/116/117 전례 반영 — 처음부터 포함)
CREATE POLICY "ups_label_docs_agency_select"
  ON public.zen_ups_label_documents FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'AGENCY'
    AND EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE zen_orders.id = zen_ups_label_documents.order_id
        AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "ups_label_docs_agency_insert"
  ON public.zen_ups_label_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'AGENCY'
    AND EXISTS (
      SELECT 1 FROM public.zen_orders
      WHERE zen_orders.id = zen_ups_label_documents.order_id
        AND zen_orders.agency_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    )
  );
