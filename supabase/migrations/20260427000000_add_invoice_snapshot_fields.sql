-- Migration: Add applied_exchange_rate to zen_invoices
-- 작성일: 2026-04-27

-- 1. 컬럼 추가
ALTER TABLE public.zen_invoices 
ADD COLUMN IF NOT EXISTS applied_exchange_rate NUMERIC(18, 6);

-- 2. 설명 추가
COMMENT ON COLUMN public.zen_invoices.applied_exchange_rate IS '인보이스 발행 시점의 적용 환율 (Snapshot)';

-- 3. 기존 데이터 업데이트 (기본값 설정 - 필요 시)
-- UPDATE public.zen_invoices SET applied_exchange_rate = 1350.0 WHERE applied_exchange_rate IS NULL;
