-- IMP-094: SHIPPER 계정 TISA 기준 운임 표시 + carrier_id backfill
-- 문제:
--   1. zen_order_rate_snapshots에 INSERT/UPDATE RLS가 ADMIN 전용이라
--      SHIPPER의 getOrderRateSnapshot() auto-capture가 차단됨.
--   2. fn_get_best_matching_rate RETURNS TABLE currency가 VARCHAR(10)이지만
--      zen_rate_cards.currency는 text 타입 → 함수 실행 시 타입 불일치 에러
--      (20260601010000 migration에서 잠입, 그동안 모든 rate match가 실패하고 있었음)
--   3. selectRoute() carrier_id 동기화 이전에 경로 선택된 order는
--      carrier_id=NULL로 트리거가 스냅샷을 생성하지 못함.

-- §1 — fn_get_best_matching_rate 타입 불일치 수정 (rc.currency::VARCHAR(10) 명시적 캐스트)
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
    ORDER BY 
        COALESCE((rc.tiers->0->>'unit_price')::DECIMAL(18,2), 999999) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- §2 — zen_order_rate_snapshots: FK rate_cards→zen_rate_cards 수정
--   rate_card_id FK가 잘못된 rate_cards 테이블을 참조 중. rate_card_id에
--   저장되는 값은 zen_rate_cards.id이므로 FK를 올바르게 재설정.
ALTER TABLE public.zen_order_rate_snapshots
  DROP CONSTRAINT IF EXISTS zen_order_rate_snapshots_rate_card_id_fkey;

ALTER TABLE public.zen_order_rate_snapshots
  ADD CONSTRAINT zen_order_rate_snapshots_rate_card_id_fkey
  FOREIGN KEY (rate_card_id) REFERENCES public.zen_rate_cards(id);

-- §3 — zen_order_rate_snapshots: org member INSERT/UPDATE 허용
-- (SELECT는 이미 org member에게 허용됨)
CREATE POLICY "org_members_can_insert_rate_snapshots"
  ON public.zen_order_rate_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = order_id
        AND is_org_member(auth.uid(), o.shipper_id)
    )
  );

CREATE POLICY "org_members_can_update_rate_snapshots"
  ON public.zen_order_rate_snapshots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = order_id
        AND is_org_member(auth.uid(), o.shipper_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = order_id
        AND is_org_member(auth.uid(), o.shipper_id)
    )
  );

-- §4 — 기존 order carrier_id backfill (selectRoute() carrier_id 동기화 이전 선택분)
-- route_option_id는 있으나 carrier_id가 NULL인 order를 segments에서 추출한
-- carrier → zen_carriers.org_id 값으로 채운다. 이 UPDATE는 DB 트리거
-- tr_capture_order_rate_snapshot을 발동시켜 스냅샷도 자동 생성한다.
UPDATE public.zen_orders zo
SET carrier_id = c.org_id
FROM public.zen_route_options zro
JOIN public.zen_carriers c
  ON c.id = ((zro.segments->0->>'carrier_id')::uuid)
WHERE zro.id = zo.route_option_id
  AND zo.route_option_id IS NOT NULL
  AND zo.carrier_id IS NULL;

-- §5 — DEF-039: CARRIER role SELECT RLS 추가
-- zen_route_network, zen_rate_cards, zen_carriers SELECT 정책에
-- CARRIER role 누락 → CARRIER 계정이 경로/요율 조회 시 빈 배열 반환
DROP POLICY IF EXISTS zen_route_network_select ON public.zen_route_network;
CREATE POLICY zen_route_network_select ON public.zen_route_network
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text, 'SHIPPER'::text, 'CORPORATE'::text, 'INDIVIDUAL'::text, 'CARRIER'::text])
    )
  );

DROP POLICY IF EXISTS zen_carriers_select ON public.zen_carriers;
CREATE POLICY zen_carriers_select ON public.zen_carriers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text, 'SHIPPER'::text, 'CORPORATE'::text, 'INDIVIDUAL'::text, 'CARRIER'::text])
    )
  );

DROP POLICY IF EXISTS zen_rate_cards_select ON public.zen_rate_cards;
CREATE POLICY zen_rate_cards_select ON public.zen_rate_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles
      WHERE zen_profiles.id = auth.uid()
      AND zen_profiles.role = ANY (ARRAY['ADMIN'::text, 'ZENITH_SUPER_ADMIN'::text, 'MANAGER'::text, 'SHIPPER'::text, 'CORPORATE'::text, 'INDIVIDUAL'::text, 'CARRIER'::text])
    )
  );
