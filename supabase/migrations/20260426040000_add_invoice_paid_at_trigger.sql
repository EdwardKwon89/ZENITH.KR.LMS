-- BUG-FIN-PAY-01 (후속): zen_invoices paid_at 자동 설정 트리거
-- 목적: status → 'PAID' 전환 시 paid_at을 자동 기록
-- 이점: 애플리케이션 코드가 PostgREST 스키마 캐시에 의존하지 않음
-- 작성일: 2026-04-26

CREATE OR REPLACE FUNCTION public.fn_set_invoice_paid_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'PAID' AND (OLD.status IS DISTINCT FROM 'PAID') THEN
    NEW.paid_at = NOW();
  END IF;
  IF NEW.status != 'PAID' THEN
    NEW.paid_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_at ON public.zen_invoices;
CREATE TRIGGER trg_invoice_paid_at
  BEFORE UPDATE ON public.zen_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_invoice_paid_at();
