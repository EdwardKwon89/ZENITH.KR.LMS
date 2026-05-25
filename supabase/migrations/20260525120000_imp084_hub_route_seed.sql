-- IMP-084: Hub 경로 탐색 시드 데이터
-- PVG→ICN (AIR/SEA) + ICN→LAX (AIR/SEA)
-- PVG→ICN→LAX Hub 경로 검증용

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'PVG', 'ICN', 'SEA', 5
FROM public.zen_carriers c WHERE c.code = 'ZENITH_SEA'
ON CONFLICT DO NOTHING;

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'PVG', 'ICN', 'AIR', 2
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR'
ON CONFLICT DO NOTHING;

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'ICN', 'LAX', 'SEA', 12
FROM public.zen_carriers c WHERE c.code = 'ZENITH_SEA'
ON CONFLICT DO NOTHING;

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'ICN', 'LAX', 'AIR', 10
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR'
ON CONFLICT DO NOTHING;
