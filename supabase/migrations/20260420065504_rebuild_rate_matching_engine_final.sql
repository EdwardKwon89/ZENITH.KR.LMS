-- 1. 기존 함수 삭제 (파라미터 시그니처 일치 확인)
DROP FUNCTION IF EXISTS public.fn_get_best_matching_rate(uuid, uuid, uuid, character varying, uuid, timestamp with time zone);

-- 2. 고도화된 함수 재구축
CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_carrier_id uuid, 
    p_origin_port_id uuid, 
    p_dest_port_id uuid, 
    p_service_type character varying, 
    p_customer_id uuid, 
    p_reference_date timestamp with time zone
)
 RETURNS TABLE(id uuid, unit_price numeric, currency character varying, base_date_rule character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.base_rate as unit_price,
        rc.currency,
        rc.base_date_rule
    FROM 
        public.zen_rate_cards rc
    -- zen_ports와 조인하여 ID 기반 매칭 수행
    JOIN 
        public.zen_ports p_origin ON rc.origin_port = p_origin.code
    JOIN 
        public.zen_ports p_dest ON rc.destination_port = p_dest.code
    WHERE 
        rc.carrier_id = p_carrier_id
        AND p_origin.id = p_origin_port_id
        AND p_dest.id = p_dest_port_id
        AND rc.service_type = p_service_type
        AND rc.status = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND p_reference_date <@ tstzrange(rc.valid_from, rc.valid_to)
    ORDER BY 
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        rc.priority DESC,
        rc.version_no DESC
    LIMIT 1;
END;
$function$;
;
