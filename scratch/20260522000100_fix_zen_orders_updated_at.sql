-- Migration: Add updated_at column to zen_orders for status update tracking
-- Timestamp: 20260522000100
-- Bug: update_order_status_atomic RPC references updated_at but column missing

-- 1. Add updated_at column with default
ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Add trigger for auto-update on row modification
CREATE OR REPLACE FUNCTION public.handle_zen_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_zen_orders_updated_at ON public.zen_orders;
CREATE TRIGGER tr_zen_orders_updated_at
  BEFORE UPDATE ON public.zen_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_zen_orders_updated_at();
