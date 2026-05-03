INSERT INTO public.zen_rate_cards (
    id,
    origin_port_id,
    dest_port_id,
    origin_code,
    dest_code,
    mode,
    service_type,
    unit_price,
    currency,
    status,
    priority,
    carrier_id
) VALUES (
    gen_random_uuid(),
    '7594faa1-2107-4529-bd41-d8476b0127b5', -- ICN
    '264d90ca-4fd7-4a60-97df-a6d831f6ba03', -- LAX
    'ICN',
    'LAX',
    'AIR',
    'AIR',
    10.5,
    'USD',
    'ACTIVE',
    10,
    (SELECT id FROM public.zen_organizations WHERE type = 'CARRIER' LIMIT 1)
) RETURNING id;

-- Insert a tier for slab rate calculation
INSERT INTO public.zen_rate_tiers (
    rate_card_id,
    min_value,
    max_value,
    unit_price
) VALUES (
    (SELECT id FROM public.zen_rate_cards WHERE origin_code = 'ICN' AND dest_code = 'LAX' LIMIT 1),
    0,
    100,
    12.0
), (
    (SELECT id FROM public.zen_rate_cards WHERE origin_code = 'ICN' AND dest_code = 'LAX' LIMIT 1),
    100,
    500,
    10.5
), (
    (SELECT id FROM public.zen_rate_cards WHERE origin_code = 'ICN' AND dest_code = 'LAX' LIMIT 1),
    500,
    99999,
    9.0
);
