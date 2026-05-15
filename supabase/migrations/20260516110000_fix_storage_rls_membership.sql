-- 20260516110000_fix_storage_rls_membership.sql
-- WBS 4.1 Phase A Security Integration - IMP-041

BEGIN;

-- 1. DROP old policies that are too permissive
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins and partners to upload invoices" ON storage.objects;

-- 2. CREATE secure policies for business_docs

-- 2.1 INSERT policy: Only allow if the path starts with the user's active org_id, OR user is an ADMIN/MANAGER
CREATE POLICY "Allow members and admins to upload business docs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'business_docs'
    AND (
        public.get_my_role() IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
        OR
        EXISTS (
            SELECT 1 FROM public.zen_profiles p
            WHERE p.id = auth.uid() 
            AND p.status = 'ACTIVE'
            AND storage.objects.name LIKE p.org_id || '/%'
        )
    )
);

-- 2.2 UPDATE/DELETE policy: Only OWNER or ADMIN/MANAGER
CREATE POLICY "Allow members and admins to update business docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'business_docs'
    AND (
        owner = auth.uid()
        OR
        public.get_my_role() IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
    )
);

CREATE POLICY "Allow members and admins to delete business docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'business_docs'
    AND (
        owner = auth.uid()
        OR
        public.get_my_role() IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
    )
);

-- 3. CREATE secure policy for invoices INSERT
CREATE POLICY "Allow admins and partners to upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'invoices'
    AND (
        public.get_my_role() IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
        OR
        EXISTS (
            SELECT 1 FROM public.zen_invoices i
            JOIN public.zen_profiles p ON i.shipper_id = p.org_id
            WHERE p.id = auth.uid() AND p.status = 'ACTIVE'
            AND storage.objects.name LIKE i.invoice_no || '/%'
        )
    )
);

-- 3.2 Add UPDATE/DELETE policies for invoices (Admins only)
CREATE POLICY "Allow admins to update invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.get_my_role() IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
);

CREATE POLICY "Allow admins to delete invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'invoices'
    AND public.get_my_role() IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN')
);

COMMIT;
