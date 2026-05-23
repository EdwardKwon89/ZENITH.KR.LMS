-- Migration: IMP-080 Fix — SHIPPER RLS + LAND carrier
-- Description: SELECT 정책에 SHIPPER 추가 + ICN→SIN LAND 루트 캐리어 정정

-- 1. Fix SELECT policies: add SHIPPER role to all 4 tables
DROP POLICY IF EXISTS "zen_carriers_manager_select" ON public.zen_carriers;
CREATE POLICY "zen_carriers_select" ON public.zen_carriers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'SHIPPER'))
  );

DROP POLICY IF EXISTS "zen_route_network_manager_select" ON public.zen_route_network;
CREATE POLICY "zen_route_network_select" ON public.zen_route_network
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'SHIPPER'))
  );

DROP POLICY IF EXISTS "zen_rate_cards_manager_select" ON public.zen_rate_cards;
CREATE POLICY "zen_rate_cards_select" ON public.zen_rate_cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'SHIPPER'))
  );

DROP POLICY IF EXISTS "zen_surcharges_manager_select" ON public.zen_surcharges;
CREATE POLICY "zen_surcharges_select" ON public.zen_surcharges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER', 'SHIPPER'))
  );

-- 2. Fix LAND route carrier: ZENITH_AIR(AIR) → ZENITH_SEA(SEA)
--    Delete incorrect LAND row referencing AIR carrier, re-insert with SEA carrier
DELETE FROM public.zen_route_network
WHERE from_port_id = 'ICN' AND to_port_id = 'SIN' AND transport_mode = 'LAND'
  AND carrier_id = (SELECT id FROM public.zen_carriers WHERE code = 'ZENITH_AIR');

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'ICN', 'SIN', 'LAND', 5
FROM public.zen_carriers c WHERE c.code = 'ZENITH_SEA'
AND NOT EXISTS (
  SELECT 1 FROM public.zen_route_network r
  WHERE r.carrier_id = c.id AND r.from_port_id = 'ICN' AND r.to_port_id = 'SIN' AND r.transport_mode = 'LAND'
);
