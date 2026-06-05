-- DEF-047: Fix zen_vessel_schedules.carrier_id FK to reference zen_carriers(id)
-- instead of zen_organizations(id). All other carrier-FK tables
-- (zen_rate_cards, zen_route_network, zen_surcharges) already reference zen_carriers.
-- The old FK was a legacy from before zen_carriers table existed (IMP-080).

ALTER TABLE public.zen_vessel_schedules
  DROP CONSTRAINT IF EXISTS zen_vessel_schedules_carrier_id_fkey;

ALTER TABLE public.zen_vessel_schedules
  ADD CONSTRAINT zen_vessel_schedules_carrier_id_fkey
  FOREIGN KEY (carrier_id) REFERENCES public.zen_carriers(id);
