-- TASK-194-A: zen_invoices 정산 마감 컬럼 추가
-- is_finalized = true: 더 이상 자동 갱신 불가 (Edward 원칙 ②)
-- finalized_at / finalized_by: 마감 시점 및 처리자 기록
-- finalized_reason: Admin 예외 처리 시 사유 필수

ALTER TABLE public.zen_invoices
  ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS finalized_reason TEXT;

-- 마감 처리 이력 인덱스 (조회 최적화)
CREATE INDEX IF NOT EXISTS idx_zen_invoices_finalized
  ON public.zen_invoices(is_finalized)
  WHERE is_finalized = true;
