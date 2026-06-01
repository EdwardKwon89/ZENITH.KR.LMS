-- UAT-02: 경로 확정 후 TISA 비용 미표시
-- 원인: selectRoute()가 zen_orders.carrier_id 미동기화 + fn_get_best_matching_rate
--   zen_carriers.org_id 컬럼 부재로 p_carrier_id→zen_carriers 매핑 실패

-- §1 — zen_carriers: org_id FK 추가 (zen_organizations 연결)
ALTER TABLE public.zen_carriers
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.zen_organizations(id);

COMMENT ON COLUMN public.zen_carriers.org_id IS '운송사 조직 ID (zen_organizations 연결)';

-- §2 — 기존 ZENITH carrier에 org_id 설정 (Zenith Logistics)
UPDATE public.zen_carriers
SET org_id = (SELECT id FROM public.zen_organizations WHERE name = 'Zenith Logistics' LIMIT 1)
WHERE code IN ('ZENITH_AIR', 'ZENITH_SEA')
  AND org_id IS NULL;

-- §3 — fn_get_best_matching_rate: zen_carriers.org_id 기반 carrier resolution
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
        RETURN;
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

-- §4 — 트리거: route_option_id UPDATE 시에도 스냅샷 캡처
DROP TRIGGER IF EXISTS tr_capture_order_rate_snapshot ON public.zen_orders;
CREATE TRIGGER tr_capture_order_rate_snapshot
AFTER INSERT OR UPDATE OF status, confirmed_at, received_at, carrier_id, origin_port_id, dest_port_id, shipper_id, route_option_id
ON public.zen_orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_capture_order_rate();
