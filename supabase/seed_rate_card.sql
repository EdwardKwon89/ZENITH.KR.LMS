INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, valid_from)
SELECT c.id, 'AIR', 'USD',
  '[{"weight_min": 0, "unit_price": 10.5}, {"weight_min": 100, "unit_price": 8.5}, {"weight_min": 500, "unit_price": 7.0}]'::jsonb,
  CURRENT_DATE
FROM public.zen_carriers c WHERE c.code = 'ZENITH_AIR';
