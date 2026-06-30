CREATE TABLE IF NOT EXISTS zen_invoice_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES zen_invoices(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     BIGINT,
  content_type  TEXT NOT NULL DEFAULT 'application/pdf',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zen_invoice_files_invoice_id ON zen_invoice_files(invoice_id);

ALTER TABLE zen_invoice_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON zen_invoice_files
  FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM zen_invoices
      WHERE shipper_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "admins_all" ON zen_invoice_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
  );
