-- Migration: Fix SECURITY DEFINER for Organization RPCs
-- Task ID: IMP-035-RL-FIX-2
-- Created At: 2026-05-15 23:50:00
-- Reason: Restoring SECURITY DEFINER for auth.users metadata updates while maintaining explicit RBAC.

BEGIN;

-- 1. approve_organization
CREATE OR REPLACE FUNCTION public.approve_organization(target_org_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
    new_id TEXT;
    target_user_id UUID;
BEGIN
    -- [A] RBAC Check: ADMIN, MANAGER, or ZENITH_SUPER_ADMIN
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to approve organizations.';
    END IF;

    -- [B] Check if already active
    IF EXISTS (SELECT 1 FROM public.zen_organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;

    -- [C] Generate 6-digit corporate ID
    new_id := LPAD(nextval('public.corporate_id_seq')::TEXT, 6, '0');

    -- [D] Update organization status and ID
    UPDATE public.zen_organizations
    SET 
        status = 'ACTIVE',
        corporate_id = new_id,
        approval_date = now()
    WHERE id = target_org_id;

    -- [E] Update profile statuses
    UPDATE public.zen_profiles
    SET status = 'ACTIVE'
    WHERE org_id = target_org_id;

    -- [F] Update auth.users metadata (Requires DEFINER)
    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('status', 'ACTIVE')
        WHERE id = target_user_id;
    END LOOP;

    RETURN new_id;
END;
$$;

-- 2. reject_organization
CREATE OR REPLACE FUNCTION public.reject_organization(
    target_org_id UUID,
    comment TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- [A] RBAC Check
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to reject organizations.';
    END IF;

    UPDATE public.zen_organizations
    SET 
        status = 'REJECTED',
        approval_comment = comment
    WHERE id = target_org_id;

    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('status', 'REJECTED')
        WHERE id = target_user_id;
    END LOOP;

    RETURN TRUE;
END;
$$;

-- 3. request_organization_supplement
CREATE OR REPLACE FUNCTION public.request_organization_supplement(
    target_org_id UUID,
    comment TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- [A] RBAC Check
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to request supplements.';
    END IF;

    UPDATE public.zen_organizations
    SET 
        status = 'SUPPLEMENT_REQUIRED',
        approval_comment = comment
    WHERE id = target_org_id;

    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('status', 'SUPPLEMENT_REQUIRED')
        WHERE id = target_user_id;
    END LOOP;

    RETURN TRUE;
END;
$$;

COMMIT;
