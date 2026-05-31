-- 20260531120000_imp092_tisa_3tier_fix.sql
-- TASK-103 ❌ 반려 수정: fn_get_best_matching_rate transport_mode 필터 + 트리거 하드코딩 제거

-- §1 — fn_get_best_matching_rate: p_service_type → zen_rate_cards.transport_mode 매핑
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
    base_date_rule VARCHAR(20),
    carrier_cost DECIMAL(18, 2),
    platform_fee_amount DECIMAL(18, 2)
) AS $$
DECLARE
    v_carrier_uuid UUID;
BEGIN
    SELECT c.id INTO v_carrier_uuid
    FROM public.zen_carriers c
    WHERE c.id = p_carrier_id
       OR c.org_id = p_carrier_id;

    IF v_carrier_uuid IS NULL THEN
        v_carrier_uuid := p_carrier_id;
    END IF;

    RETURN QUERY
    SELECT 
        rc.id,
        COALESCE((rc.tiers->0->>'unit_price')::DECIMAL(18,2), 0) AS unit_price,
        rc.currency,
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
    ORDER BY 
        COALESCE((rc.tiers->0->>'unit_price')::DECIMAL(18,2), 999999) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- §2 — 트리거 함수: 'STANDARD' 하드코딩 → NEW.transport_mode
CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
RETURNS TRIGGER AS $$
DECLARE
    v_rate_record RECORD;
    v_ref_date TIMESTAMP WITH TIME ZONE;
BEGIN
    IF NEW.confirmed_at IS NOT NULL THEN
        v_ref_date := NEW.confirmed_at;
    ELSIF NEW.received_at IS NOT NULL THEN
        v_ref_date := NEW.received_at;
    ELSE
        v_ref_date := COALESCE(NEW.order_date, NEW.created_at);
    END IF;

    SELECT * INTO v_rate_record 
    FROM public.fn_get_best_matching_rate(
        NEW.carrier_id,
        NEW.origin_port_id,
        NEW.dest_port_id,
        NEW.transport_mode,
        NEW.shipper_id,
        v_ref_date
    );

    IF v_rate_record.id IS NOT NULL THEN
        INSERT INTO public.zen_order_rate_snapshots (
            order_id,
            rate_card_id,
            applied_unit_price,
            applied_currency,
            applied_rule,
            snapshot_at,
            carrier_cost_amount,
            platform_fee_amount
        ) VALUES (
            NEW.id,
            v_rate_record.id,
            v_rate_record.unit_price,
            v_rate_record.currency,
            v_rate_record.base_date_rule,
            NOW(),
            v_rate_record.carrier_cost,
            v_rate_record.platform_fee_amount
        )
        ON CONFLICT (order_id) DO UPDATE SET
            rate_card_id = EXCLUDED.rate_card_id,
            applied_unit_price = EXCLUDED.applied_unit_price,
            applied_currency = EXCLUDED.applied_currency,
            applied_rule = EXCLUDED.applied_rule,
            snapshot_at = EXCLUDED.snapshot_at,
            carrier_cost_amount = EXCLUDED.carrier_cost_amount,
            platform_fee_amount = EXCLUDED.platform_fee_amount
        WHERE 
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
