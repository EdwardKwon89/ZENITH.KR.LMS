-- Migration: IMP-080 Zen Rate Cards (요율 카드)
-- Description: 지능형 라우팅 Phase-I — 운송 요율 카드 테이블

CREATE TABLE IF NOT EXISTS public.zen_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES public.zen_carriers(id) ON DELETE CASCADE,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('AIR','SEA','LAND','EXP')),
  currency TEXT NOT NULL DEFAULT 'USD',
  tiers JSONB NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.zen_rate_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zen_rate_cards_admin_all" ON public.zen_rate_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN'))
  );

CREATE POLICY "zen_rate_cards_manager_select" ON public.zen_rate_cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.zen_profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'MANAGER'))
  );

INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, valid_from)
SELECT c.id, 'AIR', 'USD',
  '[{"weight_min": 0, "unit_price": 5.50}, {"weight_min": 100, "unit_price": 4.80}, {"weight_min": 500, "unit_price": 3.90}]'::jsonb,
  CURRENT_DATE
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR';

INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, valid_from)
SELECT c.id, 'SEA', 'USD',
  '[{"weight_min": 0, "unit_price": 2.10}, {"weight_min": 1000, "unit_price": 1.50}, {"weight_min": 10000, "unit_price": 0.95}]'::jsonb,
  CURRENT_DATE
FROM public.zen_carriers c WHERE c.code = 'ZENITH_SEA';
