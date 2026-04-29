-- 20260418135000_create_order_rate_snapshots.sql
-- Create zen_order_rate_snapshots table (Recovered from db_dump.sql)

CREATE TABLE IF NOT EXISTS public.zen_order_rate_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    rate_card_id UUID REFERENCES public.zen_rate_cards(id) ON DELETE SET NULL,
    applied_unit_price NUMERIC(18,2) NOT NULL,
    applied_currency VARCHAR(10) DEFAULT 'USD',
    applied_rule VARCHAR(20) NOT NULL,
    snapshot_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_manual BOOLEAN DEFAULT false,
    override_reason TEXT,
    CONSTRAINT unique_order_snapshot UNIQUE (order_id)
);

-- RLS Enable
ALTER TABLE public.zen_order_rate_snapshots ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Admin only for now, can be expanded if needed)
CREATE POLICY "Super admins have full access to order snapshots" 
ON public.zen_order_rate_snapshots
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Indexing
CREATE INDEX IF NOT EXISTS idx_order_rate_snapshots_order_id ON public.zen_order_rate_snapshots(order_id);
CREATE INDEX IF NOT EXISTS idx_order_rate_snapshots_rate_card_id ON public.zen_order_rate_snapshots(rate_card_id);
