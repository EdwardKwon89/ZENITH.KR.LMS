-- Migration: Legacy Rate Cards to TISA (v1.1)
-- Description: Converts old is_active based rates to versioned, status-driven TISA records.
-- Author: ZEN CTO (AI Agent)
-- Date: 2026-04-18

BEGIN;

-- 1. Ensure extension exists
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add new columns if they don't exist (safety check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='version_no') THEN
        ALTER TABLE public.rate_cards ADD COLUMN version_no INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='status') THEN
        ALTER TABLE public.rate_cards ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='valid_from') THEN
        ALTER TABLE public.rate_cards ADD COLUMN valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='valid_to') THEN
        ALTER TABLE public.rate_cards ADD COLUMN valid_to TIMESTAMP WITH TIME ZONE DEFAULT '9999-12-31 23:59:59';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='priority') THEN
        ALTER TABLE public.rate_cards ADD COLUMN priority INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='parent_version_id') THEN
        ALTER TABLE public.rate_cards ADD COLUMN parent_version_id UUID REFERENCES public.rate_cards(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='base_date_rule') THEN
        ALTER TABLE public.rate_cards ADD COLUMN base_date_rule VARCHAR(20) DEFAULT 'RECEIPT_DATE';
    END IF;
END $$;

-- 3. Initialize legacy data
-- All existing is_active=true rates are considered Version 1, ACTIVE, and default to RECEIPT_DATE.
UPDATE public.rate_cards
SET 
    version_no = COALESCE(version_no, 1),
    status = COALESCE(status, CASE WHEN is_active = true THEN 'ACTIVE' ELSE 'EXPIRED' END),
    valid_from = COALESCE(valid_from, created_at),
    valid_to = COALESCE(valid_to, '9999-12-31 23:59:59'),
    base_date_rule = COALESCE(base_date_rule, 'RECEIPT_DATE')
WHERE status IS NULL OR version_no IS NULL;

-- 4. Apply Exclusion Constraint (Only if not already present)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_cards_no_overlap') THEN
        ALTER TABLE public.rate_cards 
        ADD CONSTRAINT rate_cards_no_overlap EXCLUDE USING gist (
            carrier_id WITH =,
            origin_port WITH =,
            destination_port WITH =,
            service_type WITH =,
            (COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
            tstzrange(valid_from, valid_to) WITH &&
        ) WHERE (status = 'ACTIVE');
    END IF;
END $$;

COMMIT;
