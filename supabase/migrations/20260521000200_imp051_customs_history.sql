-- IMP-051: Customs Declaration History Table
-- Tracks all status changes for customs declarations.

CREATE TABLE IF NOT EXISTS zen_customs_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  prev_status VARCHAR(50),
  next_status VARCHAR(50) NOT NULL,
  admin_note TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customs_history_declaration_id ON zen_customs_history(declaration_id);
CREATE INDEX idx_customs_history_created_at ON zen_customs_history(created_at DESC);
