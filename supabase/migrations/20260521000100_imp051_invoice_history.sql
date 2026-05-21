-- IMP-051: Invoice History Table
-- Tracks payment status changes and tax invoice issuance events.

CREATE TABLE IF NOT EXISTS zen_invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES zen_invoices(id) ON DELETE CASCADE,
  prev_status VARCHAR(50),
  next_status VARCHAR(50) NOT NULL,
  paid_amount NUMERIC(15, 2),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_history_invoice_id ON zen_invoice_history(invoice_id);
CREATE INDEX idx_invoice_history_created_at ON zen_invoice_history(created_at DESC);
