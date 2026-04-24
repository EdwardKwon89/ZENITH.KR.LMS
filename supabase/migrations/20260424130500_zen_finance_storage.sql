-- [FIN-01] Create a storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for invoices bucket
-- Allow Admins and Partners to upload invoices
CREATE POLICY "Allow admins and partners to upload invoices" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'invoices' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('ADMIN', 'PARTNER')
    )
);

-- Allow users to view invoices belonging to their organization
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
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    )
);
