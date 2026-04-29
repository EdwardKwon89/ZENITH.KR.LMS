-- Phase 3.3 Routing Sprint A Implementation
-- Create zen_route_options table
CREATE TABLE zen_route_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.zen_orders(id) ON DELETE CASCADE,
    option_type TEXT NOT NULL CHECK (option_type IN ('COST', 'TIME', 'BALANCED')),
    segments JSONB NOT NULL, -- Array of RouteSegment
    total_cost NUMERIC DEFAULT 0,
    total_transit_days INTEGER DEFAULT 0,
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(order_id, option_type) -- BUG-07-A: Support for UPSERT
);

-- Create zen_order_routes table (Finalized route)
CREATE TABLE zen_order_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.zen_orders(id) ON DELETE CASCADE UNIQUE,
    selected_option_id UUID REFERENCES zen_route_options(id) ON DELETE SET NULL,
    applied_at TIMESTAMPTZ DEFAULT now(),
    applied_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE zen_route_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE zen_order_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zen_route_options
CREATE POLICY "Users can view route options for their org's zen_orders" ON zen_route_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o
            JOIN public.zen_profiles p ON p.id = auth.uid()
            WHERE o.id = zen_route_options.order_id
            AND (p.org_id = o.shipper_id OR p.role = 'ADMIN')
        )
    );

CREATE POLICY "Users can manage route options for their org's zen_orders" ON zen_route_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o
            JOIN public.zen_profiles p ON p.id = auth.uid()
            WHERE o.id = zen_route_options.order_id
            AND (p.org_id = o.shipper_id OR p.role = 'ADMIN')
        )
    );

-- RLS Policies for zen_order_routes
CREATE POLICY "Users can view order routes for their org's zen_orders" ON zen_order_routes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o
            JOIN public.zen_profiles p ON p.id = auth.uid()
            WHERE o.id = zen_order_routes.order_id
            AND (p.org_id = o.shipper_id OR p.role = 'ADMIN')
        )
    );

CREATE POLICY "Users can manage order routes for their org's zen_orders" ON zen_order_routes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders o
            JOIN public.zen_profiles p ON p.id = auth.uid()
            WHERE o.id = zen_order_routes.order_id
            AND (p.org_id = o.shipper_id OR p.role = 'ADMIN')
        )
    );
