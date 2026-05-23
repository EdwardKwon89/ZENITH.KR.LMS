-- Migration: IMP-080 Zen Surcharges (할증 요율)
-- Description: 지능형 라우팅 Phase-I — 할증 유형별 요율 테이블

CREATE TABLE IF NOT EXISTS public.zen_surcharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES public.zen_carriers(id) ON DELETE CASCADE,
  surcharge_type TEXT NOT NULL,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('FLAT','PERCENT','PER_KG')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  valid_from DATE NOT NULL,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.zen_surcharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zen_surcharges_admin_all" ON public.zen_surcharges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

CREATE POLICY "zen_surcharges_manager_select" ON public.zen_surcharges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from)
SELECT c.id, 'FSC', 'AIR', 'PERCENT', 15.0, 'USD', CURRENT_DATE
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR';

INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from)
SELECT c.id, 'SSC', 'SEA', 'FLAT', 50.0, 'USD', CURRENT_DATE
FROM public.zen_carriers c WHERE c.code = 'ZENITH_SEA';
