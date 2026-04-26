-- BUG: invoices storage bucket policies exclude ZENITH_SUPER_ADMIN from upload/view.

-- 1. Drop old policies
DROP POLICY IF EXISTS "Allow admins and partners to upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their org's invoices" ON storage.objects;

-- 2. Upload policy: add ZENITH_SUPER_ADMIN
CREATE POLICY "Allow admins and partners to upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'invoices'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('ADMIN', 'PARTNER', 'ZENITH_SUPER_ADMIN', 'MANAGER')
    )
);

-- 3. View policy: add ZENITH_SUPER_ADMIN
CREATE POLICY "Allow users to view their org's invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'invoices'
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.zen_invoices i ON i.shipper_id = p.org_id
            WHERE p.id = auth.uid()
            AND (storage.objects.name LIKE i.invoice_no || '/%')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER')
        )
    )
);
