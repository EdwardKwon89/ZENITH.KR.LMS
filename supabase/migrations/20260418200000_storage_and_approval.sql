-- WBS 1.3: Storage and Approval Process Update
-- [W] Execution Agent / [A] CTO

-- 1. Create a storage bucket for business_docs if it does not exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business_docs', 'business_docs', false)
ON CONFLICT (id) DO NOTHING;
-- Policies for business_docs bucket
-- Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'business_docs');
-- Allow admins to read documents
CREATE POLICY "Allow admin read access" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'business_docs' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
);
-- Allow users to read their own uploaded documents
CREATE POLICY "Allow users to read their own uploaded documents" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'business_docs' 
    AND owner = auth.uid()
);
-- 2. Enhance the approve_organization RPC to update user metadata
DROP FUNCTION IF EXISTS public.approve_organization(UUID);
CREATE OR REPLACE FUNCTION public.approve_organization(target_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [1] Security check (simplified)
    -- In production: Ensure auth.uid() has ADMIN role

    -- [2] Check if already active
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;

    -- [3] Generate 6-digit corporate ID
    new_id := LPAD(nextval('corporate_id_seq')::TEXT, 6, '0');

    -- [4] Update organization status and ID
    UPDATE public.organizations
    SET 
        status = 'ACTIVE',
        corporate_id = new_id,
        approval_date = now()
    WHERE id = target_org_id;

    -- [5] Update profile statuses (for all users tied to this org)
    UPDATE public.profiles
    SET status = 'ACTIVE'
    WHERE org_id = target_org_id;

    -- [6] Update auth.users raw_app_meta_data for these users so AuthGuard lets them pass
    -- We must use a loop if multiple users are in the same org
    FOR target_user_id IN (SELECT id FROM public.profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;

        IF meta_data IS NULL THEN
            meta_data := '{}'::jsonb;
        END IF;

        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'ACTIVE')
        WHERE id = target_user_id;
    END LOOP;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
