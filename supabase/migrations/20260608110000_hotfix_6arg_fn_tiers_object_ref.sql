-- Hotfix: 6-arg fn_get_best_matching_rate tiers 참조 수정
-- tiers 배열(->0) → 객체(->'weight_slabs'->0)
CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_carrier_id UUID,
    p_origin_port UUID,
    p_dest_port UUID,
    p_service_type VARCHAR,
    p_customer_id UUID,
    p_reference_date TIMESTAMPTZ
)
RETURNS TABLE(
    id UUID,
    unit_price NUMERIC,
    currency VARCHAR,
    base_date_rule VARCHAR,
    carrier_cost NUMERIC,
    platform_fee_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_carrier_uuid UUID;
BEGIN
    SELECT c.id INTO v_carrier_uuid
    FROM public.zen_carriers c
    WHERE c.id = p_carrier_id
       OR c.org_id = p_carrier_id;
    IF v_carrier_uuid IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        rc.id,
        COALESCE((rc.tiers->'weight_slabs'->0->>'unit_price')::DECIMAL(18,2), 0) AS unit_price,
        rc.currency::VARCHAR(10),
        'AUTO'::VARCHAR(20) AS base_date_rule,
        rc.carrier_cost,
        CASE WHEN rc.carrier_cost IS NOT NULL AND rc.platform_fee_rate IS NOT NULL
          THEN ROUND(rc.carrier_cost * rc.platform_fee_rate / 100.0, 2)
          ELSE NULL
        END AS platform_fee_amount
    FROM
        public.zen_rate_cards rc
    WHERE
        rc.carrier_id = v_carrier_uuid
        AND rc.is_active = true
        AND rc.transport_mode = p_service_type
        AND p_reference_date::date >= rc.valid_from
        AND (rc.valid_until IS NULL OR p_reference_date::date <= rc.valid_until)
        AND (rc.origin_port_id IS NULL OR rc.origin_port_id = p_origin_port)
        AND (rc.dest_port_id IS NULL OR rc.dest_port_id = p_dest_port)
    ORDER BY
        (CASE WHEN rc.origin_port_id = p_origin_port THEN 1 ELSE 0 END +
         CASE WHEN rc.dest_port_id = p_dest_port THEN 1 ELSE 0 END) DESC,
        rc.valid_from DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.fn_get_best_matching_rate(UUID, UUID, UUID, VARCHAR, UUID, TIMESTAMPTZ)
    IS 'Hotfix: tiers 배열(->0)→객체(->''weight_slabs''->0) 참조 수정. carrier/route/date 기반 최적 카드 매칭.';
