-- Function: fn_get_best_matching_rate
-- Description: Core TISA matching engine to find the most appropriate rate for an order.
-- Author: ZEN CTO (AI Agent)
-- Date: 2026-04-18

CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_carrier_id UUID,
    p_origin_port UUID,
    p_dest_port UUID,
    p_service_type VARCHAR,
    p_customer_id UUID,
    p_reference_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    id UUID,
    unit_price DECIMAL(18, 2),
    currency VARCHAR(10),
    base_date_rule VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.unit_price,
        rc.currency,
        rc.base_date_rule
    FROM 
        public.rate_cards rc
    WHERE 
        rc.carrier_id = p_carrier_id
        AND rc.origin_port = p_origin_port
        AND rc.destination_port = p_dest_port
        AND rc.service_type = p_service_type
        AND rc.status = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND p_reference_date <@ tstzrange(rc.valid_from, rc.valid_to)
    ORDER BY 
        -- Priority 1: Customer-specific rates first
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        -- Priority 2: Higher explicit priority
        rc.priority DESC,
        -- Priority 3: Most recent version
        rc.version_no DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
