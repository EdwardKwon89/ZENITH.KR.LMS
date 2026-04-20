-- Migration: Phase 1.2 Order Rate Snapshots
-- Description: Adds state dates to zen_orders and creates the snapshot table for TISA governance.
-- Author: ZEN CTO (AI Agent)
-- Date: 2026-04-18

BEGIN;

-- 1. Update zen_orders table with required date markers
ALTER TABLE public.zen_orders 
ADD COLUMN IF NOT EXISTS order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- 2. Create zen_order_rate_snapshots table
-- This stores the physical snapshot of the rate at the time of governance trigger.
CREATE TABLE IF NOT EXISTS public.zen_order_rate_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    rate_card_id UUID REFERENCES public.rate_cards(id) ON DELETE SET NULL,
    
    -- De-normalized data for immutability
    applied_unit_price DECIMAL(18, 2) NOT NULL,
    applied_currency VARCHAR(10) DEFAULT 'USD',
    applied_rule VARCHAR(20) NOT NULL, -- The base_date_rule that triggered this
    
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Ensure one active snapshot per order (or history if needed, but here we capture the latest governance state)
    CONSTRAINT unique_order_snapshot UNIQUE (order_id)
);

-- 3. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_order_rate_snapshots_order_id ON public.zen_order_rate_snapshots(order_id);
CREATE INDEX IF NOT EXISTS idx_order_rate_snapshots_rate_card_id ON public.zen_order_rate_snapshots(rate_card_id);

COMMIT;
