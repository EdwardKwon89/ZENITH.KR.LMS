-- Trigger: tr_capture_order_rate_snapshot (v1.1)
-- Description: Updated to respect Manual Overrides as per user decision.
-- Author: ZEN CTO (AI Agent)
-- Date: 2026-04-18

CREATE OR REPLACE FUNCTION public.fn_trigger_capture_order_rate()
RETURNS TRIGGER AS $$
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

    -- 4. Execute matching engine
    SELECT * INTO v_rate_record 
    FROM public.fn_get_best_matching_rate(
        NEW.carrier_id,
        NEW.origin_port_id,
        NEW.dest_port_id,
        'STANDARD',
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
            -- Protect confirmed snapshots unless force updated via manual override API (not through this trigger)
            NOT (public.zen_order_rate_snapshots.applied_rule = 'CONFIRM_DATE');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
