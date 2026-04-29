-- BUG: zen_inventory SELECT policy only allows users whose org_id matches,
--      but ZENITH_SUPER_ADMIN has org_id=null and cannot see any inventory.

DROP POLICY IF EXISTS "Users can view inventory of their own organization" ON public.zen_inventory;

CREATE POLICY "Users can view inventory of their own organization"
ON public.zen_inventory FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE zen_profiles.id = auth.uid()
        AND (
            zen_profiles.org_id = zen_inventory.org_id
            OR zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
        )
    )
);

-- Also fix UPDATE policy to include ZENITH_SUPER_ADMIN
DROP POLICY IF EXISTS "Admins can update inventory" ON public.zen_inventory;

CREATE POLICY "Admins can update inventory"
ON public.zen_inventory FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE zen_profiles.id = auth.uid()
        AND zen_profiles.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MEMBER', 'MANAGER')
    )
);
