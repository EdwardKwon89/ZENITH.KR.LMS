-- IMP-108 §2 hotfix: trigger fn_trigger_capture_order_rate에서
-- platform_fee_amount 참조 제거 (fn_get_best_matching_rate에서 컬럼 제거됨)

CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
            carrier_cost_amount
        ) VALUES (
            NEW.id,
            v_rate_record.id,
            v_rate_record.unit_price,
            v_rate_record.currency,
            v_rate_record.base_date_rule,
            NOW(),
            v_rate_record.carrier_cost
        )
        ON CONFLICT (order_id) DO UPDATE SET
            rate_card_id = EXCLUDED.rate_card_id,
            applied_unit_price = EXCLUDED.applied_unit_price,
            applied_currency = EXCLUDED.applied_currency,
            applied_rule = EXCLUDED.applied_rule,
            snapshot_at = EXCLUDED.snapshot_at,
            carrier_cost_amount = EXCLUDED.carrier_cost_amount
        WHERE 
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;

    RETURN NEW;
END;
$function$;
