-- BUG-FIN-RLS-01: zen_invoices에 UPDATE 정책 누락
-- 문제: RLS 활성화 상태에서 UPDATE 정책이 없어 관리자의 결제 상태 변경 불가
-- 에러: "Cannot coerce the result to a single JSON object" (0 rows updated)
-- 영향: updatePaymentStatus() 완전 불능 (TC-UAT-FIN.3 블록)
-- 작성일: 2026-04-26

-- 1. zen_invoices: ADMIN/SUPER_ADMIN UPDATE 허용
CREATE POLICY "Admins can update zen_invoices" ON public.zen_invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    );

-- 2. zen_invoices: ADMIN/SUPER_ADMIN INSERT 허용 (generateInvoice 경로)
CREATE POLICY "Admins can insert zen_invoices" ON public.zen_invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    );
