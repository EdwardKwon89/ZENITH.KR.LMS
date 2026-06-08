-- Migration: IMP-105 Transport Pricing Engine Updates
-- Description: 요금 산정 방식(VOLUMETRIC, WM, WEIGHT_ONLY)을 적용하기 위한 fn_get_best_matching_rate 오버로드 및 calculate_order_costs 함수 수정

-- §1 — 4-arg fn_get_best_matching_rate 오버로드 정의 (특정 카드 내 tier 추출용)
CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_rate_card_id UUID,
    p_weight NUMERIC,
    p_cbm NUMERIC,
    p_pricing_method TEXT
)
RETURNS TABLE (
    unit_price NUMERIC,
    cbm_price NUMERIC,
    min_total_price NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tiers JSONB;
    v_matched_tier JSONB;
BEGIN
    SELECT tiers INTO v_tiers FROM public.zen_rate_cards WHERE id = p_rate_card_id;
    
    IF v_tiers IS NULL OR jsonb_array_length(v_tiers) = 0 THEN
        RETURN QUERY SELECT 0.0::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Find the tier where weight_min is the largest <= p_weight
    SELECT t INTO v_matched_tier
    FROM jsonb_array_elements(v_tiers) AS t
    WHERE p_weight >= (t->>'weight_min')::NUMERIC
    ORDER BY (t->>'weight_min')::NUMERIC DESC
    LIMIT 1;

    -- Fallback to the first tier if no tier matched
    IF v_matched_tier IS NULL THEN
        SELECT t INTO v_matched_tier
        FROM jsonb_array_elements(v_tiers) AS t
        ORDER BY (t->>'weight_min')::NUMERIC ASC
        LIMIT 1;
    END IF;

    IF v_matched_tier IS NOT NULL THEN
        RETURN QUERY SELECT 
            (v_matched_tier->>'unit_price')::NUMERIC,
            (v_matched_tier->>'cbm_price')::NUMERIC,
            (v_matched_tier->>'min_total_price')::NUMERIC;
    ELSE
        RETURN QUERY SELECT 0.0::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.fn_get_best_matching_rate(UUID, NUMERIC, NUMERIC, TEXT) IS '특정 요율 카드의 weight/cbm을 기준으로 매칭되는 tier의 단가 정보를 반환합니다.';

-- §2 — calculate_order_costs 함수 수정 (VOLUMETRIC/WM 분기 적용)
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
    SELECT id, currency, carrier_cost, platform_fee_amount 
    INTO v_rate_card_id, v_currency, v_carrier_cost, v_platform_fee_amount
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

    -- 8. zen_order_costs 저장
    SELECT id, invoice_id INTO v_unbilled_cost_id, v_existing_invoice_id
    FROM public.zen_order_costs
    WHERE order_id = p_order_id AND cost_type = 'FREIGHT'
    LIMIT 1;

    -- If invoice already issued, do not recalculate (prevent_cost_change_after_invoice rule)
    IF v_unbilled_cost_id IS NOT NULL AND v_existing_invoice_id IS NOT NULL THEN
        SELECT total_amount INTO v_total_freight
        FROM public.zen_order_costs
        WHERE id = v_unbilled_cost_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'chargeable_weight', v_chargeable_weight,
            'rate_applied', v_tier_unit_price,
            'total_freight', v_total_freight,
            'currency', v_currency
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

    -- Retrieve generated total_amount
    SELECT total_amount INTO v_total_freight
    FROM public.zen_order_costs
    WHERE id = v_cost_id;

    RETURN jsonb_build_object(
        'success',           true,
        'chargeable_weight', v_chargeable_weight,
        'rate_applied',      v_tier_unit_price,
        'total_freight',     v_total_freight,
        'currency',          v_currency
    );
END;
$$;

COMMENT ON FUNCTION public.calculate_order_costs(UUID) IS '오더의 운송 요금을 transport policy(WEIGHT_ONLY/VOLUMETRIC/WM)에 맞춰 산정한 후 zen_order_costs에 저장합니다.';
