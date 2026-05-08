-- 20260508130000_fix_rate_matching_schema_mismatch.sql

-- 1. fn_get_best_matching_rate 수정 (ID -> Code 매칭 로직으로 전환)
-- zen_rate_cards 테이블이 origin_id/destination_id 대신 origin_code/dest_code를 사용함에 따라
-- 입력받은 UUID(ID)를 zen_ports 테이블에서 조회하여 코드로 변환 후 매칭하도록 수정합니다.
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
DECLARE
    v_origin_code text;
    v_dest_code text;
BEGIN
    -- UUID로부터 포트 코드 추출
    SELECT code INTO v_origin_code FROM public.zen_ports WHERE id = p_origin_port_id;
    SELECT code INTO v_dest_code FROM public.zen_ports WHERE id = p_dest_port_id;

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
        AND (v_origin_code IS NULL OR rc.origin_code    = v_origin_code)
        AND (v_dest_code IS NULL OR rc.dest_code      = v_dest_code)
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

-- 2. fn_trigger_capture_order_rate 수정 (transport_mode 전달)
-- fn_get_best_matching_rate 호출 시 고정값 'STANDARD' 대신 오더의 실제 운송 모드(transport_mode)를 전달하도록 수정합니다.
CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_rate_record RECORD;
    v_ref_date TIMESTAMP WITH TIME ZONE;
    v_is_manual BOOLEAN;
BEGIN
    -- 1. Check for manual override status
    SELECT is_manual INTO v_is_manual 
    FROM public.zen_order_rate_snapshots 
    WHERE order_id = NEW.id;

    -- 2. Respect Manual Override: If manual, do not auto-overwrite
    IF v_is_manual IS TRUE THEN
        RETURN NEW;
    END IF;

    -- 3. Determine reference date (CONFIRM > RECEIPT > ORDER)
    IF NEW.confirmed_at IS NOT NULL THEN
        v_ref_date := NEW.confirmed_at;
    ELSIF NEW.received_at IS NOT NULL THEN
        v_ref_date := NEW.received_at;
    ELSE
        v_ref_date := COALESCE(NEW.order_date, NEW.created_at);
    END IF;

    -- 4. Execute matching engine (NEW.transport_mode 전달)
    SELECT * INTO v_rate_record 
    FROM public.fn_get_best_matching_rate(
        NEW.carrier_id,
        NEW.origin_port_id,
        NEW.dest_port_id,
        NEW.transport_mode, -- MODIFIED: Use order's transport_mode
        NEW.shipper_id,
        v_ref_date
    );

    -- 5. Atomic Snapshot persistence
    IF v_rate_record.id IS NOT NULL THEN
        INSERT INTO public.zen_order_rate_snapshots (
            order_id,
            rate_card_id,
            applied_unit_price,
            applied_currency,
            applied_rule,
            snapshot_at,
            is_manual
        ) VALUES (
            NEW.id,
            v_rate_record.id,
            v_rate_record.unit_price,
            v_rate_record.currency,
            v_rate_record.base_date_rule,
            NOW(),
            FALSE
        )
        ON CONFLICT (order_id) DO UPDATE SET
            rate_card_id = EXCLUDED.rate_card_id,
            applied_unit_price = EXCLUDED.applied_unit_price,
            applied_currency = EXCLUDED.applied_currency,
            applied_rule = EXCLUDED.applied_rule,
            snapshot_at = EXCLUDED.snapshot_at,
            is_manual = FALSE
        WHERE 
            -- Protect confirmed snapshots unless force updated via manual override API
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;

    RETURN NEW;
END;
$function$;
