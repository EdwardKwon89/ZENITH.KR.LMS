-- Migration: IMP-080 Zen Route Network (가용 루트·구간)
-- Description: 지능형 라우팅 Phase-I — 운송 루트 네트워크 테이블

CREATE TABLE IF NOT EXISTS public.zen_route_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES public.zen_carriers(id) ON DELETE CASCADE,
  from_port_id TEXT NOT NULL,
  to_port_id TEXT NOT NULL,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  transit_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carrier_id, from_port_id, to_port_id, transport_mode)
);

ALTER TABLE public.zen_route_network ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zen_route_network_admin_all" ON public.zen_route_network
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

CREATE POLICY "zen_route_network_manager_select" ON public.zen_route_network
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'ICN', 'SIN', 'SEA', 7
FROM public.zen_carriers c WHERE c.code = 'ZENITH_SEA';

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'ICN', 'SIN', 'AIR', 1
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR';

INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days)
SELECT c.id, 'ICN', 'SIN', 'LAND', 5
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR';
