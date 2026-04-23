-- Trigger: tr_capture_order_rate_snapshot
-- Description: Automatically captures and fixes the rate for an order based on TISA governance rules.
-- Author: ZEN CTO (AI Agent)
-- Date: 2026-04-18

CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
RETURNS TRIGGER AS $$
DECLARE
    v_rate_record RECORD;
    v_ref_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determine the reference date based on the priority of definitiveness: CONFIRM > RECEIPT > ORDER
    IF NEW.confirmed_at IS NOT NULL THEN
        v_ref_date := NEW.confirmed_at;
    ELSIF NEW.received_at IS NOT NULL THEN
        v_ref_date := NEW.received_at;
    ELSE
        v_ref_date := COALESCE(NEW.order_date, NEW.created_at);
    END IF;

    -- Search for the best matching rate using the TISA engine
    SELECT * INTO v_rate_record 
    FROM public.fn_get_best_matching_rate(
        NEW.carrier_id,      -- Note: Ensure carrier_id exists in zen_orders or link via booking
        NEW.origin_port_id,
        NEW.dest_port_id,
        'STANDARD',          -- Placeholder for service type, can be expanded
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
            snapshot_at
        ) VALUES (
            NEW.id,
            v_rate_record.id,
            v_rate_record.unit_price,
            v_rate_record.currency,
            v_rate_record.base_date_rule,
            NOW()
        )
        ON CONFLICT (order_id) DO UPDATE SET
            rate_card_id = EXCLUDED.rate_card_id,
            applied_unit_price = EXCLUDED.applied_unit_price,
            applied_currency = EXCLUDED.applied_currency,
            applied_rule = EXCLUDED.applied_rule,
            snapshot_at = EXCLUDED.snapshot_at
        WHERE 
            -- Do not update if the order is already 'CONFIRMED' and we have a confirmed snapshot
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_capture_order_rate_snapshot ON public.zen_orders;
CREATE TRIGGER tr_capture_order_rate_snapshot
AFTER INSERT OR UPDATE OF status, confirmed_at, received_at, carrier_id, origin_port_id, dest_port_id, shipper_id
ON public.zen_orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_capture_order_rate();
