-- BUG: zen_inventory_history has no INSERT policy, blocking all inserts via RLS.
--      Also fix SELECT policy to allow admins to view all history.

-- 1. Fix SELECT: allow admins to view all inventory history
DROP POLICY IF EXISTS "Users can view inventory history of their own organization" ON public.zen_inventory_history;

CREATE POLICY "Users can view inventory history of their own organization"
ON public.zen_inventory_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.org_id = zen_inventory_history.org_id
            OR profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    )
);

-- 2. Add INSERT policy: admins and system can insert history records
CREATE POLICY "Allow inventory history inserts"
ON public.zen_inventory_history FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'MEMBER', 'PARTNER')
    )
);
