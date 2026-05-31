-- 20260531100000_imp092_tisa_3tier_rate_structure.sql
-- TISA 요율 3계층 구조 도입 (IMP-092 · TASK-103)
-- carrier_cost + margin_rate + platform_fee_rate = unit_price (All-in)

-- §1 — zen_rate_cards: 운송사 원가·이윤율·플랫폼 수수료율 컬럼 추가
ALTER TABLE public.zen_rate_cards
  ADD COLUMN IF NOT EXISTS carrier_cost NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS margin_rate NUMERIC(5,2) DEFAULT 15.0,
  ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC(5,2) DEFAULT 5.0;

COMMENT ON COLUMN public.zen_rate_cards.carrier_cost IS '운송사 원가 (kg당)';
COMMENT ON COLUMN public.zen_rate_cards.margin_rate IS '운송사 이윤율 (%)';
COMMENT ON COLUMN public.zen_rate_cards.platform_fee_rate IS '플랫폼 수수료율 (%)';

-- §2 — zen_order_rate_snapshots: 계층별 금액 컬럼 추가
ALTER TABLE public.zen_order_rate_snapshots
  ADD COLUMN IF NOT EXISTS carrier_cost_amount NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(18,2);

COMMENT ON COLUMN public.zen_order_rate_snapshots.carrier_cost_amount IS '스냅샷 기준 운송사 원가 금액';
COMMENT ON COLUMN public.zen_order_rate_snapshots.platform_fee_amount IS '스냅샷 기준 플랫폼 수수료 금액';

-- §3 — fn_get_best_matching_rate: zen_rate_cards 조회 + carrier_cost/platform_fee_amount 반환
DROP FUNCTION IF EXISTS public.fn_get_best_matching_rate(uuid, uuid, uuid, character varying, uuid, timestamp with time zone) CASCADE;

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
    -- Resolve carrier_id: if p_carrier_id is already a zen_carriers UUID, use it directly;
    -- otherwise look up by the zen_organizations reference.
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
        AND p_reference_date::date >= rc.valid_from
        AND (rc.valid_until IS NULL OR p_reference_date::date <= rc.valid_until)
    ORDER BY 
        COALESCE((rc.tiers->0->>'unit_price')::DECIMAL(18,2), 999999) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- §4 — tr_capture_order_rate_snapshot: carrier_cost_amount + platform_fee_amount 저장
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
        'STANDARD',
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

DROP TRIGGER IF EXISTS tr_capture_order_rate_snapshot ON public.zen_orders;
CREATE TRIGGER tr_capture_order_rate_snapshot
AFTER INSERT OR UPDATE OF status, confirmed_at, received_at, carrier_id, origin_port_id, dest_port_id, shipper_id
ON public.zen_orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_capture_order_rate();

-- §5 — Seed 데이터: 기존 rate_cards에 carrier_cost + margin_rate + platform_fee_rate 설정
UPDATE public.zen_rate_cards
SET carrier_cost = CASE transport_mode
      WHEN 'AIR' THEN 4.00
      WHEN 'SEA' THEN 1.50
      WHEN 'LAND' THEN 2.50
      WHEN 'EXP' THEN 5.00
      ELSE carrier_cost
    END,
    margin_rate = 15.0,
    platform_fee_rate = 5.0
WHERE carrier_cost IS NULL
  AND is_active = true;

-- Update canonical docs to match
-- NOTE: docs/04_Database/canonical/*.sql are reference copies — this migration is the source of truth
