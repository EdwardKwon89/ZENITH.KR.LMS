-- BUG: zen_invoices & zen_order_costs SELECT policies only allow role='ADMIN',
--      but ZENITH_SUPER_ADMIN users are blocked. Extend both policies.

-- 1. zen_invoices: drop & recreate with ZENITH_SUPER_ADMIN
DROP POLICY IF EXISTS "Shippers can view their own zen_invoices" ON public.zen_invoices;

CREATE POLICY "Shippers can view their own zen_invoices" ON public.zen_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.org_id = zen_invoices.shipper_id
                OR profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
            )
        )
    );

-- 2. zen_order_costs: drop & recreate with ZENITH_SUPER_ADMIN
DROP POLICY IF EXISTS "Shippers can view their order costs" ON public.zen_order_costs;

CREATE POLICY "Shippers can view their order costs" ON public.zen_order_costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_orders
            JOIN public.profiles ON profiles.org_id = zen_orders.shipper_id
            WHERE zen_orders.id = zen_order_costs.order_id
            AND (profiles.id = auth.uid() OR profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    );
