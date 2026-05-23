-- Migration: IMP-080 Zen Carriers (운송사 마스터)
-- Description: 지능형 라우팅 Phase-I — 운송사 마스터 테이블

CREATE TABLE IF NOT EXISTS public.zen_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.zen_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zen_carriers_admin_all" ON public.zen_carriers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

CREATE POLICY "zen_carriers_manager_select" ON public.zen_carriers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

INSERT INTO public.zen_carriers (code, name, transport_mode) VALUES
  ('ZENITH_AIR', 'ZENITH Air Cargo', 'AIR'),
  ('ZENITH_SEA', 'ZENITH Maritime Logistics', 'SEA')
ON CONFLICT (code) DO NOTHING;
