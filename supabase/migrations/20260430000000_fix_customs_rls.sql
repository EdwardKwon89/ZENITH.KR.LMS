-- Fix RLS policies for customs_declarations to use zen_profiles instead of profiles
DROP POLICY IF EXISTS "Users can view their own declarations" ON public.customs_declarations;
DROP POLICY IF EXISTS "Admins can view all declarations" ON public.customs_declarations;
DROP POLICY IF EXISTS "Admins can update declarations" ON public.customs_declarations;
DROP POLICY IF EXISTS "Allow all access for admin on customs_declarations" ON public.customs_declarations;
DROP POLICY IF EXISTS "Allow select for owners on customs_declarations" ON public.customs_declarations;

CREATE POLICY "Users can view their own declarations" ON public.customs_declarations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zen_orders
            WHERE zen_orders.id = customs_declarations.order_id
            AND zen_orders.shipper_id = (SELECT org_id FROM zen_profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Admins can view all declarations" ON public.customs_declarations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM zen_profiles 
            WHERE id = auth.uid() AND role IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Admins can update declarations" ON public.customs_declarations
    FOR UPDATE USING (auth.uid() IN (
        SELECT id FROM zen_profiles WHERE id = auth.uid() AND role IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER')
    ));
