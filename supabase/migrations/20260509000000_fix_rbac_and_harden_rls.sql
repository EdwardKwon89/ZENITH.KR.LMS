-- Fix RBAC RLS policies and naming discrepancies
-- Harden RLS for organizations and organization_documents
-- Created At: 2026-05-09

-- 1. Fix zen_role_permissions RLS
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Admins have full access to zen_role_permissions" ON public.zen_role_permissions;

-- Allow all authenticated users to read permissions (required for dynamic RBAC engine)
-- This is necessary for getPermissionsByRole to work for non-admin users
CREATE POLICY "Allow authenticated users to read role permissions"
ON public.zen_role_permissions FOR SELECT TO authenticated
USING (true);

-- Allow Admins and SuperAdmins to manage permissions
CREATE POLICY "Admins have full access to zen_role_permissions"
ON public.zen_role_permissions FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')
    )
);

-- 2. Fix other tables from 20260428150000 migration that used incorrect role names
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'zen_contracts', 'zen_ports', 'zen_transport_schedules', 
        'zen_rate_tiers', 'zen_rate_cards', 'zen_system_settings', 
        'zen_tracking_scenarios', 'zen_sequences'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Drop old policy
        EXECUTE format('DROP POLICY IF EXISTS "Admins have full access to %I" ON public.%I', t, t);
        
        -- Create correct policy (Including MANAGER as platform admin where appropriate)
        EXECUTE format('
            CREATE POLICY "Admins have full access to %I"
            ON public.%I FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.zen_profiles
                    WHERE id = auth.uid() AND role IN (''ADMIN'', ''ZENITH_SUPER_ADMIN'', ''MANAGER'')
                )
            );
        ', t, t);
    END LOOP;
END $$;

-- 3. Harden Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;
CREATE POLICY "Admins can manage all organizations"
ON public.organizations FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
    )
);

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT TO authenticated
USING (
    id IN (
        SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()
    )
);

-- 4. Harden Organization Documents
ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all documents" ON public.organization_documents;
CREATE POLICY "Admins can manage all documents"
ON public.organization_documents FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
    )
);

DROP POLICY IF EXISTS "Members can view their own org documents" ON public.organization_documents;
CREATE POLICY "Members can view their own org documents"
ON public.organization_documents FOR SELECT TO authenticated
USING (
    org_id IN (
        SELECT org_id FROM public.zen_profiles WHERE id = auth.uid()
    )
);
