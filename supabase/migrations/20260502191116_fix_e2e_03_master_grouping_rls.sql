-- Migration: Enforce Strong RLS on zen_orders
-- Description: Replace broad authenticated role check with explicit role-based check for UPDATE.

-- Ensure get_my_role() exists (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE
AS $$ 
  SELECT role FROM public.zen_profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.zen_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.zen_orders;

CREATE POLICY "Admins can update orders" ON public.zen_orders
FOR UPDATE TO authenticated
USING (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'))
WITH CHECK (public.get_my_role() IN ('ZENITH_SUPER_ADMIN', 'ADMIN', 'MANAGER'));
