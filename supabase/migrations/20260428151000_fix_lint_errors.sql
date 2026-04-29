-- ============================================================
-- Fix DB Lint Errors: Column reference mismatch in rate functions
-- Created At: 2026-04-28
-- SAR 참조: DB 스키마 리팩토링 과정에서 함수 업데이트 누락
--
-- zen_rate_cards 컬럼 변경 내역:
--   base_rate      → rate_price
--   origin_port    → origin_id   (UUID FK to zen_ports)
--   destination_port → destination_id (UUID FK to zen_ports)
--   carrier_id     → org_id      (org 통합 이후)
--   base_date_rule → (제거됨, remarks에 통합)
--
-- zen_orders 컬럼 확인:
--   origin_port_id, dest_port_id → 존재하지 않음
--   transport_mode 컬럼은 존재
--   경로 정보는 zen_transport_schedules(schedule_id)를 통해 접근
-- ============================================================

-- ============================================================
-- 1. fn_get_best_matching_rate 재구축
--    반환 타입에서 base_date_rule 제거하면 기존 호출부 타입 불일치 위험.
--    따라서 NULL 허용 text로 캐스팅하여 하위 호환성 유지.
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_get_best_matching_rate(uuid, uuid, uuid, character varying, uuid, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_carrier_id         uuid,
    p_origin_port_id     uuid,
    p_dest_port_id       uuid,
    p_service_type       character varying,
    p_customer_id        uuid,
    p_reference_date     timestamp with time zone
)
RETURNS TABLE(
    id              uuid,
    unit_price      numeric,
    currency        character varying,
    base_date_rule  character varying   -- kept for backward compat; returned as remarks or empty
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.rate_price                       AS unit_price,    -- was rc.base_rate
        rc.currency::character varying,
        COALESCE(rc.remarks, '')::character varying AS base_date_rule  -- remarks 로 대체
    FROM
        public.zen_rate_cards rc
    WHERE
        rc.org_id         = p_carrier_id            -- was rc.carrier_id
        AND rc.origin_id      = p_origin_port_id    -- was rc.origin_port (code join)
        AND rc.destination_id = p_dest_port_id      -- was rc.destination_port (code join)
        AND rc.mode           = p_service_type       -- was rc.service_type
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

-- ============================================================
-- 2. calculate_order_costs 재구축
--    zen_orders에는 origin_port_id/dest_port_id가 없음.
--    대신 schedule_id → zen_transport_schedules의 origin/dest 사용.
--    schedule_id가 NULL인 경우 비용 계산 불가 처리.
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_order_costs(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        WHERE origin_id      = v_schedule.origin_port_id           -- was origin_port
          AND destination_id = v_schedule.destination_port_id      -- was destination_port
          AND mode           = v_order.transport_mode              -- was service_type
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

    v_total_freight := v_rate.rate_price * v_chargeable_weight;   -- was v_rate.base_rate

    -- 4. 정산 상세(zen_order_costs) 자동 삽입 (기존 FREIGHT 항목 교체)
    DELETE FROM public.zen_order_costs
    WHERE order_id  = p_order_id
      AND cost_type = 'FREIGHT';

    INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency)
    VALUES (p_order_id, 'FREIGHT', v_rate.rate_price, v_chargeable_weight, v_rate.currency);

    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_rate.rate_price,      -- was v_rate.base_rate
        'total_freight',     v_total_freight,
        'currency',          v_rate.currency
    );
END;
$$;
