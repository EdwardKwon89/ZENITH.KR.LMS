-- [FIN-01] 인보이스 PDF 발행 이력 관리 테이블
CREATE TABLE IF NOT EXISTS public.zen_invoice_pdf_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.zen_invoices(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, -- Storage 내 상대 경로
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb, -- 발행 시점의 환율, 비고 등 스냅샷
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_invoice_pdf_history_invoice_id ON public.zen_invoice_pdf_history(invoice_id);

-- RLS 설정
ALTER TABLE public.zen_invoice_pdf_history ENABLE ROW LEVEL SECURITY;

-- 정책: 소속 조직의 인보이스 PDF 이력만 조회 가능
CREATE POLICY "Users can view their organization's invoice PDF history" ON public.zen_invoice_pdf_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_invoices i
            JOIN public.profiles p ON p.org_id = i.shipper_id
            WHERE i.id = zen_invoice_pdf_history.invoice_id
            AND (p.id = auth.uid() OR p.role = 'ADMIN')
        )
    );

-- 정책: ADMIN/PARTNER만 PDF 이력 생성 가능
CREATE POLICY "Admins and Partners can create invoice PDF history" ON public.zen_invoice_pdf_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'PARTNER')
        )
    );
