-- Migration: Fix zen_order_services INSERT RLS — subquery auth.uid() resolution issue
-- Description: Replace subquery-based WITH CHECK with SECURITY DEFINER accessor to avoid RLS context interference.

BEGIN;

-- 1. SECURITY DEFINER helper: can the user (by auth.uid()) manage services for this order?
-- Bypasses RLS on zen_orders to avoid subquery evaluation issues in policy context.
-- plpgsql variant: SQL function had auth.uid() resolution inconsistency in subquery context.
CREATE OR REPLACE FUNCTION public.can_manage_order_services(p_order_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_count int;
BEGIN
  SELECT zo.shipper_id INTO v_org_id FROM public.zen_orders zo WHERE zo.id = p_order_id;
  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.zen_profiles zp
  WHERE zp.id = p_user_id AND zp.org_id = v_org_id AND zp.status = 'ACTIVE';

  RETURN v_count > 0;
END;
$$;

-- 2. Recreate INSERT policy on zen_order_services
DROP POLICY IF EXISTS "order_services_insert" ON public.zen_order_services;
CREATE POLICY "order_services_insert"
  ON public.zen_order_services FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR public.can_manage_order_services(order_id, auth.uid())
  );

COMMIT;
