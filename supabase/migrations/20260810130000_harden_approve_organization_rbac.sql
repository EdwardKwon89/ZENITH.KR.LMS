-- 20260810130000_harden_approve_organization_rbac.sql
-- DEF-B-039 (Issue #1026): approve_organization() 최후 방어선 — 승인 대상 조직에
-- 전역 관리자급 역할(ADMIN/MANAGER/ZENITH_SUPER_ADMIN) 프로필이 있으면 승인 차단.
-- 결함 A가 향후 재발해도 관리자 승인 시점에 잡아낸다.

BEGIN;

CREATE OR REPLACE FUNCTION public.approve_organization(target_org_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
    new_id TEXT;
    target_user_id UUID;
    privileged_count INT;
BEGIN
    -- [A] RBAC Check: ADMIN, MANAGER, or ZENITH_SUPER_ADMIN
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to approve organizations.';
    END IF;

    -- [B] Check if already active
    IF EXISTS (SELECT 1 FROM public.zen_organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;

    -- [A'] DEF-B-039: 조직 내 전역 관리자급 역할 프로필 사전 차단
    SELECT COUNT(*) INTO privileged_count
    FROM public.zen_profiles
    WHERE org_id = target_org_id
      AND role IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN');

    IF privileged_count > 0 THEN
        RAISE EXCEPTION 'Privileged role detected in organization (%): % profile(s) with ADMIN/MANAGER role. Approve denied — demote roles first.',
            target_org_id, privileged_count;
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

COMMIT;
