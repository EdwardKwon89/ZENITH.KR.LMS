-- TASK-B-120 / Issue #455: get_next_order_sequence RBAC에 AGENCY, AGENCY_SHIPPER 추가
-- AGENCY/AGENCY_SHIPPER 역할 계정이 오더 등록 시 시퀀스를 생성할 수 있도록 허용

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

COMMENT ON FUNCTION public.get_next_order_sequence IS '연도 및 접두사별 하우스 오더 일련번호를 생성합니다. 화주(CORPORATE/INDIVIDUAL) + Agency(AGENCY/AGENCY_SHIPPER) 허용';
