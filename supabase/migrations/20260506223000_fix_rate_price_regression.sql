-- [Gemini] Fix rate_price to unit_price regression in DB functions
-- 사유: zen_rate_cards 테이블의 컬럼명이 unit_price로 변경되었으나, 
-- 일부 함수(calculate_order_costs, fn_get_best_matching_rate)가 
-- 존재하지 않는 rate_price를 참조하여 QA-02 회귀 결함 발생.

-- 1. calculate_order_costs 함수 수정
CREATE OR REPLACE FUNCTION public.calculate_order_costs(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_order             RECORD;
    v_schedule          RECORD;
    v_rate              RECORD;
    v_chargeable_weight NUMERIC;
    v_total_freight     NUMERIC;
BEGIN
    -- 1. 오더 정보 조회
    SELECT * INTO v_order FROM public.zen_orders WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '오더를 찾을 수 없습니다.');
    END IF;

    -- 2. 스케줄에서 출발/도착 항구 ID 획득
    --    zen_orders에 origin_port_id가 없으므로 schedule을 통해 경로 파악
    IF v_order.schedule_id IS NOT NULL THEN
        SELECT * INTO v_schedule
        FROM public.zen_transport_schedules
        WHERE id = v_order.schedule_id;
    END IF;

    -- Chargeable Weight 계산 (임시: estimated_cost 값 사용, 추후 cargo_details JSONB 파싱으로 교체)
    v_chargeable_weight := COALESCE((v_order.estimated_cost)::NUMERIC, 1.0);

    -- 3. 요율 매칭
    --    스케줄 존재 시 경로 기반 매칭, 없으면 transport_mode만으로 매칭
    IF v_schedule IS NOT NULL THEN
        SELECT * INTO v_rate
        FROM public.zen_rate_cards
        WHERE origin_id      = v_schedule.origin_port_id
          AND destination_id = v_schedule.destination_port_id
          AND mode           = v_order.transport_mode
          AND status         = 'ACTIVE'
        ORDER BY priority DESC, created_at DESC
        LIMIT 1;
    ELSE
        -- 스케줄 없이 transport_mode 만으로 최우선 요율 검색 (Fallback)
        SELECT * INTO v_rate
        FROM public.zen_rate_cards
        WHERE mode   = v_order.transport_mode
          AND status = 'ACTIVE'
        ORDER BY priority DESC, created_at DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '유효한 요율 카드를 찾을 수 없습니다.');
    END IF;

    -- [FIX] rate_price -> unit_price
    v_total_freight := v_rate.unit_price * v_chargeable_weight;

    -- 4. 정산 상세(zen_order_costs) 자동 삽입 (기존 FREIGHT 항목 교체)
    DELETE FROM public.zen_order_costs
    WHERE order_id  = p_order_id
      AND cost_type = 'FREIGHT';

    -- [FIX] rate_price -> unit_price
    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.unit_price, v_chargeable_weight, v_rate.currency);

    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_rate.unit_price,
        'total_freight',     v_total_freight,
        'currency',          v_rate.currency
    );
END;
$function$;

-- 2. fn_get_best_matching_rate 함수 수정
CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(p_carrier_id uuid, p_origin_port_id uuid, p_dest_port_id uuid, p_service_type character varying, p_customer_id uuid, p_reference_date timestamp with time zone)
 RETURNS TABLE(id uuid, unit_price numeric, currency character varying, base_date_rule character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.unit_price                       AS unit_price,    -- [FIX] rate_price -> unit_price
        rc.currency::character varying,
        COALESCE(rc.remarks, '')::character varying AS base_date_rule
    FROM
        public.zen_rate_cards rc
    WHERE
        rc.org_id         = p_carrier_id
        AND rc.origin_id      = p_origin_port_id
        AND rc.destination_id = p_dest_port_id
        AND rc.mode           = p_service_type
        AND rc.status         = 'ACTIVE'
        AND (rc.customer_id IS NULL OR rc.customer_id = p_customer_id)
        AND p_reference_date  <@ tstzrange(rc.valid_from, rc.valid_to)
    ORDER BY
        (CASE WHEN rc.customer_id = p_customer_id THEN 1 ELSE 0 END) DESC,
        rc.priority DESC,
        rc.version_no DESC
    LIMIT 1;
END;
$function$;
