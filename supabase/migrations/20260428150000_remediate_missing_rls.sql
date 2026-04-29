-- RLS Remediation Migration
-- 9 tables identified as insecure by Supabase CLI diagnostic
-- Created At: 2026-04-28

-- 1. Enable RLS for all 9 tables
ALTER TABLE public.zen_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_transport_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_rate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_tracking_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_sequences ENABLE ROW LEVEL SECURITY;

-- 2. Define Admin/SuperAdmin Full Access Policies
-- Using a helper function if available, but here we'll define explicit policies

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'zen_contracts', 'zen_ports', 'zen_transport_schedules', 
        'zen_rate_tiers', 'zen_rate_cards', 'zen_system_settings', 
        'zen_role_permissions', 'zen_tracking_scenarios', 'zen_sequences'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('
            CREATE POLICY "Admins have full access to %I"
            ON public.%I FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.zen_profiles
                    WHERE id = auth.uid() AND role IN (''ZENITH_ADMIN'', ''ZENITH_SUPER_ADMIN'')
                )
            );
        ', t, t);
    END LOOP;
END $$;

-- 3. Public Master Data: SELECT access for all authenticated users
-- zen_ports, zen_transport_schedules
CREATE POLICY "Authenticated users can view ports"
    ON public.zen_ports FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view transport schedules"
    ON public.zen_transport_schedules FOR SELECT TO authenticated
    USING (true);

-- 4. Private/Owner Data: Access based on org_id/shipper_id
-- zen_contracts (shipper_id)
CREATE POLICY "Shippers can view their own contracts"
    ON public.zen_contracts FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE id = auth.uid() AND org_id = zen_contracts.shipper_id
        )
    );

-- zen_rate_cards (org_id or customer_id)
CREATE POLICY "Users can view their related rate cards"
    ON public.zen_rate_cards FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE id = auth.uid() AND (org_id = zen_rate_cards.org_id OR org_id = zen_rate_cards.customer_id)
        )
    );

-- zen_rate_tiers (linked to zen_rate_cards)
CREATE POLICY "Users can view related rate tiers"
    ON public.zen_rate_tiers FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.zen_rate_cards rc
            JOIN public.zen_profiles p ON p.id = auth.uid() 
            WHERE rc.id = zen_rate_tiers.rate_card_id
            AND (p.org_id = rc.org_id OR p.org_id = rc.customer_id)
        )
    );

-- 5. System level tables (settings, permissions, scenarios, sequences)
-- These remain Admin only (already covered by Admin policy above)
