-- 20260507130000_fix_calculate_order_costs.sql

-- 1. fn_get_best_matching_rate 수정 (p_carrier_id NULL 허용 및 정교화)
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
        rc.unit_price                       AS unit_price,
        rc.currency::character varying,
        COALESCE(rc.remarks, '')::character varying AS base_date_rule
    FROM
        public.zen_rate_cards rc
    WHERE
        (p_carrier_id IS NULL OR rc.org_id = p_carrier_id)
        AND rc.origin_id      = p_origin_port_id
        AND rc.destination_id = p_dest_port_id
        AND rc.mode           = p_service_type
        AND rc.status         = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND (rc.valid_to IS NULL OR p_reference_date <= rc.valid_to)
        AND (rc.valid_from <= p_reference_date)
    ORDER BY
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        rc.priority DESC,
        rc.version_no DESC
    LIMIT 1;
END;
$function$;

-- 2. calculate_order_costs 수정
CREATE OR REPLACE FUNCTION public.calculate_order_costs(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_order             RECORD;
    v_rate              RECORD;
    v_chargeable_weight NUMERIC;
    v_total_freight     NUMERIC;
BEGIN
    -- 1. 오더 정보 조회
    SELECT * INTO v_order FROM public.zen_orders WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '오더를 찾을 수 없습니다.');
    END IF;

    -- 2. Chargeable Weight 계산 (zen_order_packages 총합)
    SELECT COALESCE(SUM(gross_weight), 1.0) INTO v_chargeable_weight
    FROM public.zen_order_packages
    WHERE order_id = p_order_id;

    IF v_chargeable_weight = 0 THEN
        v_chargeable_weight := 1.0;
    END IF;

    -- 3. 요율 매칭 (fn_get_best_matching_rate 호출)
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

    -- 4. 정산 상세(zen_order_costs) 자동 삽입 (기존 FREIGHT 항목 교체)
    -- total_amount는 generated column이므로 INSERT에서 제외
    DELETE FROM public.zen_order_costs
    WHERE order_id  = p_order_id
      AND cost_type = 'FREIGHT';

    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.unit_price, v_chargeable_weight, v_rate.currency);

    -- 생성된 total_amount를 포함한 결과를 반환하기 위해 다시 조회
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
$function$;
