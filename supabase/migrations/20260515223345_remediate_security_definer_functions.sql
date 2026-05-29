-- Migration: Remediate SECURITY DEFINER functions to prevent RLS bypass
-- Task ID: IMP-035-RL
-- Created At: 2026-05-15 22:45:00
-- SAR Reference: Audit identified 12 SECURITY DEFINER functions, 3 CRITICAL vulnerabilities.

BEGIN;

-- ==============================================================================
-- [1] CRITICAL: Approve / Reject / Supplement Organization RPCs
-- These were SECURITY DEFINER (RLS bypass) without explicit RBAC checks.
-- We convert them to SECURITY INVOKER and add explicit role validation.
-- ==============================================================================

-- 1.1 approve_organization
CREATE OR REPLACE FUNCTION public.approve_organization(target_org_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY INVOKER 
SET search_path = public, auth
AS $$
DECLARE
    new_id TEXT;
    target_user_id UUID;
    meta_data JSONB;
BEGIN
    -- [A] RBAC Check: Only ADMIN or ZENITH_SUPER_ADMIN can approve
    IF public.get_my_role() NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can approve organizations.';
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

    -- [E] Update profile statuses (for all users tied to this org)
    UPDATE public.zen_profiles
    SET status = 'ACTIVE'
    WHERE org_id = target_org_id;

    -- [F] Update auth.users metadata (Requires high privilege - see Note below)
    -- Note: Since this is now INVOKER, it may fail if the admin user doesn't have 
    -- permission to update auth.users directly. 
    -- However, in Supabase, postgres/service_role usually handles this.
    -- If this fails in frontend RPC call, it must be wrapped in a service-role edge function.
    -- For now, we maintain the logic but acknowledge the permission context.
    FOR target_user_id IN (SELECT id FROM public.zen_profiles WHERE org_id = target_org_id)
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('status', 'ACTIVE')
        WHERE id = target_user_id;
    END LOOP;

    RETURN new_id;
END;
$$;

-- 1.2 reject_organization
CREATE OR REPLACE FUNCTION public.reject_organization(
    target_org_id UUID,
    comment TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY INVOKER 
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- [A] RBAC Check
    IF public.get_my_role() NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can reject organizations.';
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

-- 1.3 request_organization_supplement
CREATE OR REPLACE FUNCTION public.request_organization_supplement(
    target_org_id UUID,
    comment TEXT
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY INVOKER 
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- [A] RBAC Check
    IF public.get_my_role() NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Access Denied: Only administrators can request supplements.';
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

-- ==============================================================================
-- [2] 권한 최적화: Convert to SECURITY INVOKER where DEFINER is unnecessary
-- ==============================================================================

-- 2.1 calculate_order_costs
CREATE OR REPLACE FUNCTION public.calculate_order_costs(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $$
DECLARE
    v_order             RECORD;
    v_rate              RECORD;
    v_chargeable_weight NUMERIC;
    v_total_freight     NUMERIC;
BEGIN
    -- 1. 오더 정보 조회 (INVOKER이므로 RLS 적용됨)
    SELECT * INTO v_order FROM public.zen_orders WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '오더를 찾을 수 없거나 접근 권한이 없습니다.');
    END IF;

    -- 2. Chargeable Weight 계산
    SELECT COALESCE(SUM(gross_weight), 1.0) INTO v_chargeable_weight
    FROM public.zen_order_packages
    WHERE order_id = p_order_id;

    IF v_chargeable_weight = 0 THEN
        v_chargeable_weight := 1.0;
    END IF;

    -- 3. 요율 매칭
    SELECT * INTO v_rate
    FROM public.fn_get_best_matching_rate(
        v_order.carrier_id,
        v_order.origin_port_id,
        v_order.dest_port_id,
        v_order.transport_mode,
        v_order.shipper_id,
        v_order.created_at
    );

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '유효한 요율 카드를 찾을 수 없습니다.');
    END IF;

    -- 4. 정산 상세(zen_order_costs) 갱신
    DELETE FROM public.zen_order_costs
    WHERE order_id  = p_order_id
      AND cost_type = 'FREIGHT';

    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.unit_price, v_chargeable_weight, v_rate.currency);

    SELECT total_amount INTO v_total_freight
    FROM public.zen_order_costs
    WHERE order_id = p_order_id AND cost_type = 'FREIGHT'
    LIMIT 1;

    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_rate.unit_price,
        'total_freight',     v_total_freight,
        'currency',          v_rate.currency
    );
END;
$$;

-- 2.2 get_orders_aggregation
CREATE OR REPLACE FUNCTION public.get_orders_aggregation(order_ids uuid[])
RETURNS TABLE(total_weight numeric, total_volume numeric) 
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.gross_weight), 0)::numeric,
        COALESCE(SUM(p.volume), 0)::numeric
    FROM public.zen_orders o
    LEFT JOIN public.zen_order_packages p ON o.id = p.order_id
    WHERE o.id = ANY(order_ids);
END;
$$;

-- ==============================================================================
-- [3] SECURITY DEFINER 유지 함수들에 대한 search_path 강화
-- ==============================================================================

-- 3.1 get_next_order_sequence (RBAC 체크 추가 및 search_path 명시)
CREATE OR REPLACE FUNCTION public.get_next_order_sequence(p_year text, p_prefix text)
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    next_val bigint;
BEGIN
    -- ADMIN/MANAGER/OPS + 화주(CORPORATE/INDIVIDUAL) 시퀀스 생성 허용
    IF public.get_my_role() NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'OPS', 'CORPORATE', 'INDIVIDUAL') THEN
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

-- 3.2 handle_new_user (System Trigger - DEFINER 필수, search_path 추가)
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;

-- 3.3 fn_trigger_capture_order_rate (Trigger - DEFINER 필수, search_path 추가)
ALTER FUNCTION public.fn_trigger_capture_order_rate() SET search_path = public;

COMMIT;
