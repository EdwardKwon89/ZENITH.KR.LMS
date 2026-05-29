-- get_next_order_sequence RBAC 완화: 화주(CORPORATE/INDIVIDUAL) 시퀀스 생성 허용
-- DEF-022: CORPORATE/INDIVIDUAL 유저가 create_order_atomic RPC 호출 시
-- "Access Denied: Insufficient permissions to generate sequence" 오류 수정
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

COMMENT ON FUNCTION public.get_next_order_sequence IS '연도 및 접두사별 하우스 오더 일련번호를 생성합니다. 화주(CORPORATE/INDIVIDUAL) 허용';
