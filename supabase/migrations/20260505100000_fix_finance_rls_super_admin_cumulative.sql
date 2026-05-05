-- 20260505100000_fix_finance_rls_super_admin_cumulative.sql
-- Description: Fix RLS policies for tax invoices and PDF history to include ZENITH_SUPER_ADMIN
-- Created: 2026-05-05

-- 1. zen_tax_invoices fix
DROP POLICY IF EXISTS "Admins can issue and update tax invoices" ON public.zen_tax_invoices;
CREATE POLICY "Admins can issue and update tax invoices" ON public.zen_tax_invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    );

DROP POLICY IF EXISTS "Shippers can view their own tax invoices" ON public.zen_tax_invoices;
CREATE POLICY "Shippers can view their own tax invoices" ON public.zen_tax_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_invoices 
            JOIN public.zen_profiles ON zen_profiles.id = auth.uid()
            WHERE zen_invoices.id = zen_tax_invoices.invoice_id 
            AND (zen_profiles.org_id = zen_invoices.shipper_id OR zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
        )
    );

-- 2. zen_invoice_pdf_history fix
DROP POLICY IF EXISTS "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history;
CREATE POLICY "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_invoices i
            JOIN public.zen_profiles p ON p.org_id = i.shipper_id
            WHERE i.id = zen_invoice_pdf_history.invoice_id
            AND (p.id = auth.uid() OR p.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
        )
    );

DROP POLICY IF EXISTS "Admins and Partners can create invoice PDF history" ON public.zen_invoice_pdf_history;
CREATE POLICY "Admins and Partners can create invoice PDF history" ON public.zen_invoice_pdf_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE zen_profiles.id = auth.uid()
            AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'PARTNER')
        )
    );
