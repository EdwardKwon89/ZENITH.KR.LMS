-- TASK-194-C: zen_invoice_history에 notes 컬럼 추가
-- 정산 마감·거부 시 사유/비고를 기록하기 위함

ALTER TABLE public.zen_invoice_history
  ADD COLUMN IF NOT EXISTS notes TEXT;
