-- BUG-04: zen_invoice_pdf_history RLS 정책 수정 (역할군 보완)

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Admins and Partners can create invoice PDF history" ON public.zen_invoice_pdf_history;
DROP POLICY IF EXISTS "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history;

-- 2. SELECT 정책 재정의 (ZENITH_SUPER_ADMIN 추가)
CREATE POLICY "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_invoices i
            JOIN public.zen_profiles p ON p.org_id = i.shipper_id
            WHERE i.id = zen_invoice_pdf_history.invoice_id
            AND (p.id = auth.uid() OR p.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
        )
    );

-- 3. INSERT 정책 재정의 (MANAGER 추가, ZENITH_SUPER_ADMIN 추가, PARTNER 제거)
CREATE POLICY "Admins and Managers can create invoice PDF history" ON public.zen_invoice_pdf_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.zen_profiles
            WHERE zen_profiles.id = auth.uid()
            AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
        )
    );
