-- WBS 1.3.1: Enhancement of Approval Workflow (Supplement Request & Re-apply)
-- [W] Execution Agent / [A] CTO

-- 1. Add approval_comment to zen_organizations for transparency (Rejection why? Supplement what?)
ALTER TABLE public.zen_organizations ADD COLUMN IF NOT EXISTS approval_comment TEXT;
-- 2. Create RPC for requesting supplement
-- This status will trigger a specific UI in the /register/pending page
CREATE OR REPLACE FUNCTION public.request_organization_supplement(
    target_org_id UUID,
    comment TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [1] Update organization status and comment
    UPDATE public.zen_organizations
    SET 
        status = 'SUPPLEMENT_REQUIRED',
        approval_comment = comment
    WHERE id = target_org_id;

    -- [2] Update profile status for all users in this org
    UPDATE public.zen_profiles
    SET status = 'PENDING' -- Profiles remain pending until final approval
    WHERE org_id = target_org_id;

    -- [3] Sync with Auth Metadata so Proxy (Middleware) knows the detailed status
    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN meta_data := '{}'::jsonb; END IF;

        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'SUPPLEMENT_REQUIRED')
        WHERE id = target_user_id;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 3. Create RPC for rejection (with reason)
CREATE OR REPLACE FUNCTION public.reject_organization(
    target_org_id UUID,
    comment TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    UPDATE public.zen_organizations
    SET 
        status = 'REJECTED',
        approval_comment = comment
    WHERE id = target_org_id;

    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        SELECT raw_app_meta_data INTO meta_data FROM auth.users WHERE id = target_user_id;
        IF meta_data IS NULL THEN meta_data := '{}'::jsonb; END IF;

        UPDATE auth.users
        SET raw_app_meta_data = meta_data || jsonb_build_object('status', 'REJECTED')
        WHERE id = target_user_id;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
