-- WBS 1.3: Migrate Organization Documents to Zen Prefix
-- [W] CTO / [A] Audit Agent

-- 1. Rename table to follow zen_ prefix convention
ALTER TABLE IF EXISTS public.organization_documents RENAME TO zen_organization_documents;

-- 2. Update foreign key to point to zen_organizations instead of legacy organizations
ALTER TABLE public.zen_organization_documents
    DROP CONSTRAINT IF EXISTS organization_documents_org_id_fkey,
    DROP CONSTRAINT IF EXISTS zen_organization_documents_org_id_fkey;
ALTER TABLE public.zen_organization_documents
    ADD CONSTRAINT zen_organization_documents_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES public.zen_organizations(id) ON DELETE CASCADE;

-- 3. Update RLS policies to reference zen_profiles
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.zen_organization_documents;
CREATE POLICY "Admins can manage all documents" ON public.zen_organization_documents
    USING (EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE zen_profiles.id = auth.uid() AND zen_profiles.role = 'ADMIN'
    ));

DROP POLICY IF EXISTS "Members can view their own org documents" ON public.zen_organization_documents;
CREATE POLICY "Members can view their own org documents" ON public.zen_organization_documents
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.zen_profiles
        WHERE zen_profiles.id = auth.uid() AND zen_profiles.org_id = zen_organization_documents.org_id
    ));

-- 4. Enable RLS (just in case)
ALTER TABLE public.zen_organization_documents ENABLE ROW LEVEL SECURITY;
