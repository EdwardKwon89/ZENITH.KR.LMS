-- BUG-FIN-PAY-01: zen_invoices 테이블에 paid_at 컬럼 누락
-- 문제: updatePaymentStatus()가 paid_at 컬럼에 쓰기 시도 → schema cache 오류
-- 영향: Confirm Payment 기능 완전 불능
-- 작성일: 2026-04-26

ALTER TABLE public.zen_invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;
