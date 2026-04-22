-- [WBS 2.2] 하우스 오더 합산 데이터 조회를 위한 RPC
-- 작성일: 2026-04-21
-- 수행주체: CTO Agent

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

COMMENT ON FUNCTION public.get_orders_aggregation IS '지정된 하우스 오더들의 총 중량 및 CBM을 합산하여 반환합니다.';
