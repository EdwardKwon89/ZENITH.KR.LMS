-- IMP-108 §2: platform_fee_amount 재정의
-- carrier_cost 기반 precompute → total_freight 기반 calculate_order_costs 내 계산으로 전환
-- carrier_cost 컬럼은 DB에 유지 (하위 호환)

-- 0. 기존 함수 DROP (return type 변경 필요)
DROP FUNCTION IF EXISTS public.fn_get_best_matching_rate(uuid,uuid,uuid,character varying,uuid,timestamp with time zone);

-- 1. 6-arg fn_get_best_matching_rate: platform_fee_amount 컬럼 제거
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
    carrier_cost NUMERIC
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
        rc.carrier_cost
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

-- 2. calculate_order_costs: platform_fee_rate 조회 + total_freight 기반 수수료 계산
CREATE OR REPLACE FUNCTION public.calculate_order_costs(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order                 RECORD;
    v_policy                RECORD;
    v_actual_weight         NUMERIC;
    v_cargo_cbm             NUMERIC;
    v_chargeable_weight     NUMERIC;
    v_rate_card_id          UUID;
    v_currency              VARCHAR(10);
    v_carrier_cost          NUMERIC;
    v_platform_fee_rate     NUMERIC;
    v_platform_fee_amount   NUMERIC;

    -- matched tier info
    v_tier_unit_price       NUMERIC;
    v_tier_cbm_price        NUMERIC;
    v_tier_min_total_price  NUMERIC;

    -- calculated costs
    v_weight_cost           NUMERIC;
    v_cbm_cost              NUMERIC;
    v_total_freight         NUMERIC;

    -- for insert/update in zen_order_costs
    v_cost_id               UUID;
    v_unbilled_cost_id      UUID;
    v_existing_invoice_id   UUID;
BEGIN
    -- 1. 오더 정보 조회
    SELECT * INTO v_order FROM public.zen_orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', '오더를 찾을 수 없습니다.');
    END IF;

    -- 2. 실제 중량 및 CBM 계산 (zen_order_packages)
    SELECT COALESCE(SUM(gross_weight), 0.0), COALESCE(SUM(volume), 0.0)
    INTO v_actual_weight, v_cargo_cbm
    FROM public.zen_order_packages
    WHERE order_id = p_order_id;

    -- Fallbacks if packages not found or values are 0
    IF v_actual_weight = 0.0 THEN
        v_actual_weight := COALESCE(v_order.estimated_cost, 1.0);
    END IF;
    IF v_actual_weight = 0.0 THEN
        v_actual_weight := 1.0;
    END IF;

    -- 3. 운송수단별 정책 조회
    SELECT * INTO v_policy
    FROM public.zen_transport_pricing_policies
    WHERE transport_mode = v_order.transport_mode;

    -- Default policy if not found
    IF NOT FOUND THEN
        v_policy.pricing_method := 'WEIGHT_ONLY';
        v_policy.volumetric_divisor := 6000;
    END IF;

    -- 4. 요율 카드 매칭 (6-arg fn_get_best_matching_rate 호출)
    SELECT id, currency, carrier_cost
    INTO v_rate_card_id, v_currency, v_carrier_cost
    FROM public.fn_get_best_matching_rate(
        v_order.carrier_id,
        v_order.origin_port_id,
        v_order.dest_port_id,
        v_order.transport_mode,
        v_order.shipper_id,
        COALESCE(v_order.created_at, now())
    );

    IF v_rate_card_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '유효한 요율 카드를 찾을 수 없습니다.');
    END IF;

    -- 5. Chargeable Weight 계산
    IF v_policy.pricing_method = 'WEIGHT_ONLY' THEN
        v_chargeable_weight := v_actual_weight;
    ELSIF v_policy.pricing_method = 'VOLUMETRIC' THEN
        v_chargeable_weight := GREATEST(v_actual_weight, (v_cargo_cbm * 1000000.0) / COALESCE(v_policy.volumetric_divisor, 6000.0));
    ELSE
        v_chargeable_weight := v_actual_weight;
    END IF;

    -- 6. matched tier 가격 획득 (4-arg fn_get_best_matching_rate 호출)
    SELECT unit_price, cbm_price, min_total_price
    INTO v_tier_unit_price, v_tier_cbm_price, v_tier_min_total_price
    FROM public.fn_get_best_matching_rate(v_rate_card_id, v_chargeable_weight, v_cargo_cbm, v_policy.pricing_method);

    -- 7. 운임(total_freight) 산정
    IF v_policy.pricing_method = 'WM' THEN
        v_weight_cost := v_actual_weight * v_tier_unit_price;
        v_cbm_cost := v_cargo_cbm * COALESCE(v_tier_cbm_price, 0.0);
        v_total_freight := GREATEST(v_weight_cost, v_cbm_cost);
    ELSE
        v_total_freight := v_chargeable_weight * v_tier_unit_price;
    END IF;

    -- Apply minimum total price constraint
    v_total_freight := GREATEST(v_total_freight, COALESCE(v_tier_min_total_price, 0.0));

    -- 7b. platform_fee_rate 조회 + 수수료 계산 (IMP-108 §2: total_freight 기반)
    SELECT platform_fee_rate INTO v_platform_fee_rate
    FROM public.zen_rate_cards WHERE id = v_rate_card_id;

    v_platform_fee_amount := CASE
        WHEN v_platform_fee_rate IS NOT NULL AND v_platform_fee_rate > 0
        THEN ROUND(v_total_freight * v_platform_fee_rate / 100.0, 2)
        ELSE 0
    END;

    -- 8. zen_order_costs 저장
    SELECT id, invoice_id INTO v_unbilled_cost_id, v_existing_invoice_id
    FROM public.zen_order_costs
    WHERE order_id = p_order_id AND cost_type = 'FREIGHT'
    LIMIT 1;

    -- If invoice already issued, do not recalculate
    IF v_unbilled_cost_id IS NOT NULL AND v_existing_invoice_id IS NOT NULL THEN
        SELECT total_amount INTO v_total_freight
        FROM public.zen_order_costs
        WHERE id = v_unbilled_cost_id;

        RETURN jsonb_build_object(
            'success', true,
            'chargeable_weight', v_chargeable_weight,
            'rate_applied', v_tier_unit_price,
            'total_freight', v_total_freight,
            'currency', v_currency,
            'platform_fee_amount', v_platform_fee_amount
        );
    END IF;

    -- If there's an unbilled cost, update it; otherwise insert
    IF v_unbilled_cost_id IS NOT NULL THEN
        UPDATE public.zen_order_costs
        SET unit_price = CASE WHEN v_policy.pricing_method = 'WM' THEN v_total_freight / GREATEST(v_chargeable_weight, 1.0) ELSE v_tier_unit_price END,
            quantity = v_chargeable_weight,
            currency = v_currency
        WHERE id = v_unbilled_cost_id;
        v_cost_id := v_unbilled_cost_id;
    ELSE
        INSERT INTO public.zen_order_costs (order_id, cost_type, unit_price, quantity, currency, is_revenue)
        VALUES (
            p_order_id,
            'FREIGHT',
            CASE WHEN v_policy.pricing_method = 'WM' THEN v_total_freight / GREATEST(v_chargeable_weight, 1.0) ELSE v_tier_unit_price END,
            v_chargeable_weight,
            v_currency,
            true
        )
        RETURNING id INTO v_cost_id;
    END IF;

    SELECT total_amount INTO v_total_freight
    FROM public.zen_order_costs
    WHERE id = v_cost_id;

    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_tier_unit_price,
        'total_freight',     v_total_freight,
        'currency',          v_currency,
        'platform_fee_amount', v_platform_fee_amount
    );
END;
$$;
