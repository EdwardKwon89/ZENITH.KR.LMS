-- IMP-095: Rate Card 항로(Port) 기반 매칭
-- 문제: fn_get_best_matching_rate가 p_origin_port·p_dest_port를
--       파라미터로 받지만 WHERE 절에서 무시 -> 동일 carrier+mode면
--       항로 무관 동일 요율 카드 반환.
-- 해결:
--   1. zen_rate_cards에 origin_port_id / dest_port_id 컬럼 추가
--   2. fn_get_best_matching_rate WHERE + ORDER BY 포트 조건 반영
--   3. TISARateMatcher.matchRateCard() 포트 파라미터 지원 (APP)
--   4. RateCardForm 포트 드롭다운 추가 (APP)

-- §1 — zen_rate_cards port 컬럼 추가
ALTER TABLE public.zen_rate_cards
  ADD COLUMN IF NOT EXISTS origin_port_id UUID REFERENCES public.zen_ports(id),
  ADD COLUMN IF NOT EXISTS dest_port_id UUID REFERENCES public.zen_ports(id);

COMMENT ON COLUMN public.zen_rate_cards.origin_port_id IS '출발항 ID (NULL=항로 무관 fallback)';
COMMENT ON COLUMN public.zen_rate_cards.dest_port_id IS '도착항 ID (NULL=항로 무관 fallback)';

-- §2 — fn_get_best_matching_rate 재정의 (포트 조건 추가)
-- 정밀 우선 · NULL fallback 순서로 매칭
CREATE OR REPLACE FUNCTION public.fn_get_best_matching_rate(
    p_carrier_id UUID,
    p_origin_port UUID,
    p_dest_port UUID,
    p_service_type VARCHAR,
    p_customer_id UUID,
    p_reference_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    id UUID,
    unit_price DECIMAL(18, 2),
    currency VARCHAR(10),
    base_date_rule VARCHAR(20),
    carrier_cost DECIMAL(18, 2),
    platform_fee_amount DECIMAL(18, 2)
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_carrier_uuid UUID;
BEGIN
    -- Carrier resolution: accepts zen_carriers.id or zen_carriers.org_id
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
        rc.currency::VARCHAR(10),
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
        -- §2-1: 포트 조건 — NULL 카드는 모든 항로 매칭 허용
        AND (rc.origin_port_id IS NULL OR rc.origin_port_id = p_origin_port)
        AND (rc.dest_port_id IS NULL OR rc.dest_port_id = p_dest_port)
    ORDER BY
        -- §2-2: 정밀 우선 정렬 (origin+dest 일치=2 > 한쪽=1 > NULL fallback=0)
        (CASE WHEN rc.origin_port_id = p_origin_port THEN 1 ELSE 0 END +
         CASE WHEN rc.dest_port_id = p_dest_port THEN 1 ELSE 0 END) DESC,
        rc.valid_from DESC
    LIMIT 1;
END;
$function$;

-- §3 — RLS: zen_ports SELECT (이미 존재하나 CARRIER 누락 시 대비)
DROP POLICY IF EXISTS zen_ports_select_all ON public.zen_ports;
CREATE POLICY zen_ports_select_all ON public.zen_ports
  FOR SELECT
  TO authenticated
  USING (true);
