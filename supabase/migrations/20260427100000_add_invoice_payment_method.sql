-- [PH5-WAL-02] zen_invoices 테이블 결제 수단(payment_method) 확장
-- 작성일: 2026-04-27

ALTER TABLE public.zen_invoices
ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER'
CHECK (payment_method IN ('BANK_TRANSFER', 'WALLET'));

-- 기존 데이터에 대한 설명 인덱스 추가 (조회 성능 향상)
CREATE INDEX idx_zen_invoices_payment_method ON public.zen_invoices (payment_method);

COMMENT ON COLUMN public.zen_invoices.payment_method IS '결제 방식 (BANK_TRANSFER: 무통장입금, WALLET: 선불지갑)';
