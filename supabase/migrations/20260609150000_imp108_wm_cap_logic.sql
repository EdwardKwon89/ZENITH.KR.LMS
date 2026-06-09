-- IMP-108 §3: WM CLAMP (max_charge cap) + applied_pricing_basis
-- fn_get_best_matching_rate 4-arg: max_total_price 컬럼 추가
-- calculate_order_costs: min_charge→max_charge CLAMP + applied_pricing_basis 반환

-- 1. 4-arg fn_get_best_matching_rate 재정의 (max_total_price 추가, return type 변경 → DROP 필요)
DROP FUNCTION IF EXISTS public.fn_get_best_matching_rate(uuid, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_rate_card_id UUID,
    p_weight NUMERIC,
    p_cbm NUMERIC,
    p_pricing_method TEXT
)
RETURNS TABLE (
    unit_price NUMERIC,
    cbm_price NUMERIC,
    min_total_price NUMERIC,
    max_total_price NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tiers          JSONB;
    v_weight_slabs   JSONB;
    v_cbm_slabs      JSONB;
    v_matched_weight JSONB;
    v_matched_cbm    JSONB;
BEGIN
    SELECT tiers INTO v_tiers FROM public.zen_rate_cards WHERE id = p_rate_card_id;

    IF v_tiers IS NULL OR jsonb_typeof(v_tiers) <> 'object' THEN
        RETURN QUERY SELECT 0.0::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;

    v_weight_slabs := v_tiers->'weight_slabs';
    v_cbm_slabs    := v_tiers->'cbm_slabs';

    IF v_weight_slabs IS NULL OR jsonb_array_length(v_weight_slabs) = 0 THEN
        RETURN QUERY SELECT 0.0::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
        RETURN;
    END IF;

    -- weight_slabs: weight_min 기준 매칭
    SELECT t INTO v_matched_weight
    FROM jsonb_array_elements(v_weight_slabs) AS t
    WHERE p_weight >= (t->>'weight_min')::NUMERIC
    ORDER BY (t->>'weight_min')::NUMERIC DESC
    LIMIT 1;

    IF v_matched_weight IS NULL THEN
        SELECT t INTO v_matched_weight
        FROM jsonb_array_elements(v_weight_slabs) AS t
        ORDER BY (t->>'weight_min')::NUMERIC ASC
        LIMIT 1;
    END IF;

    -- cbm_slabs: cbm_min 기준 매칭
    IF v_cbm_slabs IS NOT NULL AND jsonb_array_length(v_cbm_slabs) > 0 THEN
        SELECT t INTO v_matched_cbm
        FROM jsonb_array_elements(v_cbm_slabs) AS t
        WHERE p_cbm >= (t->>'cbm_min')::NUMERIC
        ORDER BY (t->>'cbm_min')::NUMERIC DESC
        LIMIT 1;

        IF v_matched_cbm IS NULL THEN
            SELECT t INTO v_matched_cbm
            FROM jsonb_array_elements(v_cbm_slabs) AS t
            ORDER BY (t->>'cbm_min')::NUMERIC ASC
            LIMIT 1;
        END IF;
    END IF;

    IF v_matched_weight IS NOT NULL THEN
        RETURN QUERY SELECT
            (v_matched_weight->>'unit_price')::NUMERIC,
            CASE WHEN v_matched_cbm IS NOT NULL THEN (v_matched_cbm->>'cbm_price')::NUMERIC ELSE NULL END,
            COALESCE(
                NULLIF((v_matched_weight->>'min_charge'), '')::NUMERIC,
                NULLIF((v_matched_cbm->>'min_charge'), '')::NUMERIC,
                NULL
            ),
            NULLIF((v_matched_weight->>'max_charge'), '')::NUMERIC;
    ELSE
        RETURN QUERY SELECT 0.0::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.fn_get_best_matching_rate(UUID, NUMERIC, NUMERIC, TEXT) IS 'IMP-108 §3: weight_slabs/cbm_slabs 매칭 + max_charge(max_total_price) 반환';

-- 2. calculate_order_costs 재정의 (WM CLAMP + applied_pricing_basis)
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
    v_tier_max_total_price  NUMERIC;

    -- calculated costs
    v_weight_cost           NUMERIC;
    v_cbm_cost              NUMERIC;
    v_total_freight         NUMERIC;

    -- pricing basis tracking (IMP-108 §3)
    v_applied_basis         TEXT;

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
    SELECT unit_price, cbm_price, min_total_price, max_total_price
    INTO v_tier_unit_price, v_tier_cbm_price, v_tier_min_total_price, v_tier_max_total_price
    FROM public.fn_get_best_matching_rate(v_rate_card_id, v_chargeable_weight, v_cargo_cbm, v_policy.pricing_method);

    -- 7. 운임(total_freight) 산정 — IMP-108 §3: CLAMP + applied_pricing_basis
    v_applied_basis := NULL;

    IF v_policy.pricing_method = 'WM' THEN
        v_weight_cost := v_actual_weight * v_tier_unit_price;
        v_cbm_cost := v_cargo_cbm * COALESCE(v_tier_cbm_price, 0.0);
        v_total_freight := GREATEST(v_weight_cost, v_cbm_cost);
        v_applied_basis := CASE WHEN v_weight_cost >= v_cbm_cost THEN 'WEIGHT' ELSE 'CBM' END;
    ELSE
        v_total_freight := v_chargeable_weight * v_tier_unit_price;
    END IF;

    -- min_charge 적용 (하한선)
    IF v_total_freight < COALESCE(v_tier_min_total_price, 0) THEN
        v_total_freight := v_tier_min_total_price;
        v_applied_basis := 'MIN_CHARGE';
    END IF;

    -- max_charge 적용 (상한선, IMP-108 §3)
    IF v_tier_max_total_price IS NOT NULL AND v_tier_max_total_price > 0
       AND v_total_freight > v_tier_max_total_price THEN
        v_total_freight := v_tier_max_total_price;
        v_applied_basis := 'MAX_CHARGE';
    END IF;

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
        'success',                true,
        'chargeable_weight',      v_chargeable_weight,
        'rate_applied',           v_tier_unit_price,
        'total_freight',          v_total_freight,
        'currency',               v_currency,
        'platform_fee_amount',    v_platform_fee_amount,
        'applied_pricing_basis',  v_applied_basis
    );
END;
$$;

COMMENT ON FUNCTION public.calculate_order_costs(UUID) IS 'IMP-108 §3: WM CLAMP (max_charge cap) + applied_pricing_basis';
