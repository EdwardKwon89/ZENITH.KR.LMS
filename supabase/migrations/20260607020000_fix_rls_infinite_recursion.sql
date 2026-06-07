-- Migration: Fix RLS Infinite Recursion between zen_orders and zen_order_services
-- Description: Define SECURITY DEFINER helpers to bypass RLS in policy checks and recreate SELECT policies.

BEGIN;

-- 1. Helper function to check if user organization is the shipper of the order (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_order_shipper(p_order_id uuid, p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zen_orders
    WHERE id = p_order_id AND shipper_id = p_org_id
  );
$$;

-- 2. Helper function to check if user organization is a service provider of the order (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_order_provider(p_order_id uuid, p_provider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.zen_order_services
    WHERE order_id = p_order_id AND provider_id = p_provider_id
  );
$$;

-- 3. Recreate SELECT policy on zen_order_services
DROP POLICY IF EXISTS "order_services_select" ON public.zen_order_services;
CREATE POLICY "order_services_select"
  ON public.zen_order_services FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'MANAGER')
    OR provider_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
    OR public.is_order_shipper(order_id, (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  );

-- 4. Recreate SELECT policy on zen_orders
DROP POLICY IF EXISTS "Service providers can view assigned orders" ON public.zen_orders;
CREATE POLICY "Service providers can view assigned orders"
  ON public.zen_orders FOR SELECT
  TO authenticated
  USING (
    public.is_order_provider(id, (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
  );

COMMIT;
