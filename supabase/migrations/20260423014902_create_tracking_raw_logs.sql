-- [BE-02] External Tracking Raw Log Table
-- Purpose: Store unprocessed JSON from carrier APIs for audit and debugging

CREATE TABLE IF NOT EXISTS public.zen_tracking_raw_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    tracking_no TEXT,
    provider_name TEXT NOT NULL, -- e.g., 'FEDEX', 'DHL'
    raw_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tracking_raw_logs_order ON public.zen_tracking_raw_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_raw_logs_no ON public.zen_tracking_raw_logs(tracking_no);

-- RLS
ALTER TABLE public.zen_tracking_raw_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view raw logs (for debugging/audit)
-- Note: Shippers/Partners usually don't need access to raw provider JSON.
CREATE POLICY "Admins have full access to tracking raw logs" ON public.zen_tracking_raw_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );
