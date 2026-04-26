-- Migration: Add applied_exchange_rate to zen_invoices
-- Description: WBS 4.3.2.1 Rework - Store exchange rate snapshot at invoice creation time.
-- Author: Riley (via Antigravity)

ALTER TABLE public.zen_invoices
  ADD COLUMN IF NOT EXISTS applied_exchange_rate NUMERIC(18,6);

ALTER TABLE public.zen_tax_invoices
  ADD COLUMN IF NOT EXISTS applied_exchange_rate NUMERIC(18,6);

COMMENT ON COLUMN public.zen_invoices.applied_exchange_rate IS 'Exchange rate snapshot used for this invoice (USD/KRW)';
COMMENT ON COLUMN public.zen_tax_invoices.applied_exchange_rate IS 'Exchange rate snapshot used for this tax invoice (USD/KRW)';
