-- Migration: Prevent cost changes after invoice issuance
-- Task ID: IMP-044-BK, IMP-044-BK-FIX
-- Created At: 2026-05-16 09:00:00
-- FIX: TG_OP 분기 — DELETE는 OLD, UPDATE는 NEW 반환 (2026-05-16)
-- Reason: zen_order_costs: invoice_id가 설정된 레코드의 UPDATE/DELETE를 차단하여
--         인보이스 발행 후 비용 변경을 방지합니다.
--         addIncidentFee()는 MASTERED Lock(IMP-042-043-BK)으로 별도 처리합니다.

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.fn_prevent_cost_change_after_invoice()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot modify order costs after invoice has been issued (invoice_id: %)', OLD.invoice_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. 트리거 등록
CREATE TRIGGER trg_prevent_cost_change_after_invoice
BEFORE UPDATE OR DELETE ON public.zen_order_costs
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_cost_change_after_invoice();

-- 3. 인덱스 (성능 최적화: invoice_id NULL 여부로 필터링)
CREATE INDEX IF NOT EXISTS idx_zen_order_costs_invoice_id ON public.zen_order_costs(invoice_id);
