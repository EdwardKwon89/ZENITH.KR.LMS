-- [IMP-057] zen_role_permissions SELECT restriction
-- Restrict SELECT access to zen_role_permissions to only Admins or the role owner
-- Created At: 2026-05-16

-- 1. Drop existing loose policy
DROP POLICY IF EXISTS "Allow authenticated users to read role permissions" ON public.zen_role_permissions;

-- 2. Create restricted SELECT policy
-- Admins/Managers can see all, others can only see permissions for THEIR OWN role
CREATE POLICY "Restricted SELECT for role permissions"
ON public.zen_role_permissions FOR SELECT TO authenticated
USING (
    -- Case 1: Platform Admins (ADMIN, MANAGER, ZENITH_SUPER_ADMIN) can see everything
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
    )
    OR
    -- Case 2: Regular users can only see paths mapped to THEIR OWN role
    role_code = (SELECT role FROM public.zen_profiles WHERE id = auth.uid())
);

-- Note: All permissions related to INSERT/UPDATE/DELETE are already handled by 
-- "Admins have full access to zen_role_permissions" policy in 20260509000000 migration.
