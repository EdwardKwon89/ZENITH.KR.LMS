-- [API Audit] 누락된 RPC 함수 복구 및 시퀀스 관리 시스템 구축
-- 작성일: 2026-04-22
-- 수행주체: CTO Agent

-- 1. 하우스 오더 번호 생성을 위한 시퀀스 관리 테이블
CREATE TABLE IF NOT EXISTS public.zen_sequences (
    prefix TEXT,
    year TEXT,
    last_value BIGINT DEFAULT 0,
    PRIMARY KEY (prefix, year)
);

-- 2. 하우스 오더 번호 생성 함수 (get_next_order_sequence)
-- 형식: {Prefix}-{YYYY}-{6자리 시퀀스} (예: ZEN-2026-000001)
CREATE OR REPLACE FUNCTION public.get_next_order_sequence(p_year text, p_prefix text)
RETURNS text AS $$
DECLARE
    next_val bigint;
BEGIN
    INSERT INTO public.zen_sequences (prefix, year, last_value)
    VALUES (p_prefix, p_year, 1)
    ON CONFLICT (prefix, year)
    DO UPDATE SET last_value = zen_sequences.last_value + 1
    RETURNING last_value INTO next_val;

    RETURN p_prefix || '-' || p_year || '-' || LPAD(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 하우스 오더 합산 중량/부피 계산 함수 (get_orders_aggregation)
CREATE OR REPLACE FUNCTION public.get_orders_aggregation(order_ids uuid[])
RETURNS TABLE(total_weight numeric, total_volume numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.gross_weight), 0)::numeric,
        COALESCE(SUM(p.volume), 0)::numeric
    FROM public.zen_orders o
    LEFT JOIN public.zen_order_packages p ON o.id = p.order_id
    WHERE o.id = ANY(order_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_next_order_sequence IS '연도 및 접두사별 하우스 오더 일련번호를 생성합니다.';
COMMENT ON FUNCTION public.get_orders_aggregation IS '지정된 하우스 오더들의 총 중량 및 CBM을 합산하여 반환합니다.';
