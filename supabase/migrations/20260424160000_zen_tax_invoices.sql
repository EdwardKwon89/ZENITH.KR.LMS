-- 20260424160000_zen_tax_invoices.sql
-- Description: WBS 3.2.5.1 Tax Invoice Table and RLS
-- Created: 2026-04-24

-- 1. 세금계산서 발행 및 이력 테이블 생성
CREATE TABLE IF NOT EXISTS public.zen_tax_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.zen_invoices(id) ON DELETE CASCADE,
    tax_invoice_no TEXT UNIQUE NOT NULL, -- TX-YYYYMMDD-SERIAL
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'SENT', 'FAILED')),
    supplier_info JSONB NOT NULL,
    buyer_info JSONB NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    recipient_email TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ DEFAULT now(),
    issued_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb, -- messageId, error_log 등 저장
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS 활성화
ALTER TABLE public.zen_tax_invoices ENABLE ROW LEVEL SECURITY;

-- 3. 정책 설정 (Profiles 및 Organizations 참조)
-- SELECT: 소속 조직의 인보이스와 연결된 세금계산서만 조회 가능 (Admin은 전체 가능)
CREATE POLICY "Shippers can view their own tax invoices" ON public.zen_tax_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.zen_invoices 
            JOIN public.zen_profiles ON zen_profiles.id = auth.uid()
            WHERE zen_invoices.id = zen_tax_invoices.invoice_id 
            AND (zen_profiles.org_id = zen_invoices.shipper_id OR zen_profiles.role = 'ADMIN')
        )
    );

-- INSERT/UPDATE: ZENITH_SUPER_ADMIN 또는 ZENITH_MANAGER 권한 필요 (Admin 역할 내에서 체크)
CREATE POLICY "Admins can issue and update tax invoices" ON public.zen_tax_invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.zen_profiles 
            WHERE zen_profiles.id = auth.uid() 
            AND zen_profiles.role = 'ADMIN'
        )
    );

-- 4. updated_at 트리거 (존재하는 경우 재사용)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timestamp_column') THEN
        CREATE TRIGGER tr_zen_tax_invoices_updated_at
        BEFORE UPDATE ON public.zen_tax_invoices
        FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();
    END IF;
END $$;
