-- Migration: Create zen_inventory and zen_inventory_history
-- Timestamp: 20260425115000

-- Create zen_inventory table
CREATE TABLE IF NOT EXISTS public.zen_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
    sku_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    on_hand_qty NUMERIC NOT NULL DEFAULT 0,
    reserved_qty NUMERIC NOT NULL DEFAULT 0,
    available_qty NUMERIC GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED,
    min_stock_level NUMERIC DEFAULT 0,
    warehouse_location TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, sku_code)
);

-- Create zen_inventory_history table
CREATE TABLE IF NOT EXISTS public.zen_inventory_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.zen_inventory(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.zen_organizations(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    change_qty NUMERIC NOT NULL,
    result_qty NUMERIC NOT NULL,
    reference_id TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.zen_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_inventory_history ENABLE ROW LEVEL SECURITY;

-- Add indices
CREATE INDEX IF NOT EXISTS idx_zen_inventory_org_id ON public.zen_inventory(org_id);
CREATE INDEX IF NOT EXISTS idx_zen_inventory_sku_code ON public.zen_inventory(sku_code);
CREATE INDEX IF NOT EXISTS idx_zen_inventory_history_inventory_id ON public.zen_inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_zen_inventory_history_org_id ON public.zen_inventory_history(org_id);
