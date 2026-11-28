-- ============================================================================
-- TASK-B-403 (Issue #1579) — RPC 실행 권한·호출자 검증 정렬
--
-- 목표 상태(IS #1579):
--   · 대상 RPC는 인증된 호출자만 실행한다.
--   · 역할을 확인할 수 없는 호출은 거부한다.
--   · 허용 역할(관리자 계열 등 기존 규칙)은 종전대로 동작한다.
--   · 호출자가 사용자·조직 식별자를 인자로 넘기는 RPC의 인자 신원 검증은
--     이번 단계 범위 밖이며, 비인증 호출 거부까지만 적용한다.
--
-- 이 마이그레이션은 기존 마이그레이션을 수정하지 않는 신규 파일이다.
-- 파일 단위 선적용이 가능하도록 단일 트랜잭션으로 구성한다.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- A. 역할 확인을 NULL 안전으로 정렬 (4개)
--    함수 정의는 기존 정의를 그대로 두고 역할 확인 한 줄만 COALESCE로 감싼다.
-- ----------------------------------------------------------------------------

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
    IF COALESCE(public.get_my_role(), '') NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') AND COALESCE(auth.role(), '') <> 'service_role'
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
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
    IF COALESCE(public.get_my_role(), '') NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') AND COALESCE(auth.role(), '') <> 'service_role'
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
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
    IF COALESCE(public.get_my_role(), '') NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') AND COALESCE(auth.role(), '') <> 'service_role'
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
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

CREATE OR REPLACE FUNCTION public.get_next_order_sequence(p_year text, p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_val bigint;
BEGIN
    -- ADMIN/MANAGER/OPS + 화주(CORPORATE/INDIVIDUAL) + Agency(AGENCY/AGENCY_SHIPPER) 시퀀스 생성 허용
    IF COALESCE(public.get_my_role(), '') NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'OPS', 'CORPORATE', 'INDIVIDUAL', 'AGENCY', 'AGENCY_SHIPPER') AND COALESCE(auth.role(), '') <> 'service_role'
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to generate sequence.';
    END IF;

    INSERT INTO public.zen_sequences (prefix, year, last_value)
    VALUES (p_prefix, p_year, 1)
    ON CONFLICT (prefix, year)
    DO UPDATE SET last_value = zen_sequences.last_value + 1
    RETURNING last_value INTO next_val;

    RETURN p_prefix || '-' || p_year || '-' || LPAD(next_val::text, 6, '0');
END;
$$;

-- ----------------------------------------------------------------------------
-- B. 실행 권한 정렬 — 대상 RPC 7개 모두 인증된 호출자만 실행
--    (A 4개 + 오더 계열 3개. 오더 계열은 이번 단계에서 정의를 변경하지 않는다.)
-- ----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.approve_organization(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_organization(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_organization_supplement(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_next_order_sequence(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_order_atomic(jsonb, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_order_services_atomic(uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dissolve_master_order_atomic(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_organization(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_organization(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_organization_supplement(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_order_sequence(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(jsonb, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_services_atomic(uuid, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dissolve_master_order_atomic(uuid, uuid) TO authenticated, service_role;

COMMIT;

-- ============================================================================
-- ROLLBACK (적용 전 상태 복원 — 주석 해제 후 실행)
--   A 4개 함수 정의를 COALESCE 이전으로 되돌리고, 7개 함수의 실행 권한을
--   PUBLIC 기본 허용으로 복원한다.
-- ============================================================================
/*
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
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to approve organizations.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.zen_organizations WHERE id = target_org_id AND status = 'ACTIVE') THEN
        RETURN 'ALREADY_ACTIVE';
    END IF;

    SELECT COUNT(*) INTO privileged_count
    FROM public.zen_profiles
    WHERE org_id = target_org_id
      AND role IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN');

    IF privileged_count > 0 THEN
        RAISE EXCEPTION 'Privileged role detected in organization (%): % profile(s) with ADMIN/MANAGER role. Approve denied — demote roles first.',
            target_org_id, privileged_count;
    END IF;

    new_id := LPAD(nextval('public.corporate_id_seq')::TEXT, 6, '0');

    UPDATE public.zen_organizations
    SET status = 'ACTIVE', corporate_id = new_id, approval_date = now()
    WHERE id = target_org_id;

    UPDATE public.zen_profiles SET status = 'ACTIVE' WHERE org_id = target_org_id;

    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('status', 'ACTIVE')
        WHERE id = target_user_id;
    END LOOP;

    RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_organization(target_org_id UUID, comment TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to reject organizations.';
    END IF;

    UPDATE public.zen_organizations
    SET status = 'REJECTED', approval_comment = comment
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

CREATE OR REPLACE FUNCTION public.request_organization_supplement(target_org_id UUID, comment TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    IF public.get_my_role() NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to request supplements.';
    END IF;

    UPDATE public.zen_organizations
    SET status = 'SUPPLEMENT_REQUIRED', approval_comment = comment
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

CREATE OR REPLACE FUNCTION public.get_next_order_sequence(p_year text, p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_val bigint;
BEGIN
    IF public.get_my_role() NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'OPS', 'CORPORATE', 'INDIVIDUAL', 'AGENCY', 'AGENCY_SHIPPER') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient permissions to generate sequence.';
    END IF;

    INSERT INTO public.zen_sequences (prefix, year, last_value)
    VALUES (p_prefix, p_year, 1)
    ON CONFLICT (prefix, year)
    DO UPDATE SET last_value = zen_sequences.last_value + 1
    RETURNING last_value INTO next_val;

    RETURN p_prefix || '-' || p_year || '-' || LPAD(next_val::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_organization(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_organization(uuid, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_organization_supplement(uuid, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_order_sequence(text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(jsonb, uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_services_atomic(uuid, jsonb, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.dissolve_master_order_atomic(uuid, uuid) TO PUBLIC;

COMMIT;
*/
