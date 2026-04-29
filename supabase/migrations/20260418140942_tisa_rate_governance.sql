-- TISA Rate Governance Migration
-- Adds version control, validity periods, and constraints to zen_rate_cards

-- Enable btree_gist extension for EXCLUDE constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- 1. Extend zen_rate_cards
ALTER TABLE public.zen_rate_cards
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUPERSEDED')),
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.zen_organizations(id);
-- 2. Prevent overlapping of ACTIVE/SUPERSEDED/DRAFT records across dates?
-- Design calls for: EXCLUDE USING gist (carrier_id WITH =, origin_port WITH =, destination_port WITH =, service_type WITH =, customer_id WITH =, tstzrange(valid_from, valid_to) WITH &&)
-- Adapted for actual table columns:
ALTER TABLE public.zen_rate_cards
  ADD CONSTRAINT prevent_rate_overlap 
  EXCLUDE USING gist (
    org_id WITH =, 
    origin_code WITH =, 
    dest_code WITH =, 
    mode WITH =, 
    unit_type WITH =,
    COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    tstzrange(valid_from, valid_to) WITH &&
  ) WHERE (status = 'ACTIVE');
-- 3. Extend zen_order_rate_snapshots to support TISA references
ALTER TABLE public.zen_order_rate_snapshots
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
