-- ============================================================================
-- Seed: Realistic Freight Rate Data
-- 실제 항공/해상/특송 운임 데이터 샘플 (IDEMPOTENT)
-- ============================================================================

-- ============================================================================
-- 1. 운송사 (Carriers)
-- ============================================================================
INSERT INTO public.zen_carriers (code, name, transport_mode) VALUES
  ('KAL_CARGO', 'Korean Air Cargo', 'AIR'),
  ('AAR_CARGO', 'Asiana Cargo', 'AIR'),
  ('FEDEX', 'FedEx Express', 'EXP'),
  ('DHL', 'DHL Express', 'EXP'),
  ('HMM', 'HMM Shipping', 'SEA'),
  ('MSC', 'MSC Mediterranean Shipping', 'SEA'),
  ('EVERGREEN', 'Evergreen Marine', 'SEA')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. Rate Cards — 현실적인 Slab 요율
-- ============================================================================
DO $$
DECLARE
  v_carrier_id UUID;
  v_port_icn UUID; v_port_lax UUID; v_port_pus UUID; v_port_lgb UUID;
  v_port_sin UUID; v_port_nrt UUID; v_port_hkg UUID; v_port_fra UUID;
BEGIN
  SELECT id INTO v_port_icn FROM public.zen_ports WHERE code = 'ICN';
  SELECT id INTO v_port_lax FROM public.zen_ports WHERE code = 'LAX';
  SELECT id INTO v_port_pus FROM public.zen_ports WHERE code = 'PUS';
  SELECT id INTO v_port_lgb FROM public.zen_ports WHERE code = 'LGB';
  SELECT id INTO v_port_sin FROM public.zen_ports WHERE code = 'SIN';
  SELECT id INTO v_port_nrt FROM public.zen_ports WHERE code = 'NRT';
  SELECT id INTO v_port_hkg FROM public.zen_ports WHERE code = 'HKG';
  SELECT id INTO v_port_fra FROM public.zen_ports WHERE code = 'FRA';

  -- ========================================================================
  -- KAL_CARGO — ICN→LAX 항공
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'KAL_CARGO';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'AIR' AND origin_port_id = v_port_icn AND dest_port_id = v_port_lax AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'AIR', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":3.50,"min_charge":75},{"weight_min":45,"unit_price":2.80,"min_charge":126},{"weight_min":100,"unit_price":2.50,"min_charge":250},{"weight_min":300,"unit_price":2.20,"min_charge":660},{"weight_min":500,"unit_price":1.90,"min_charge":950}],"cbm_slabs":[{"cbm_min":0,"cbm_price":584.50,"min_charge":75}]}'::jsonb,
      v_port_icn, v_port_lax, CURRENT_DATE, 1.50, 15.0, 5.0);
  END IF;

  -- KAL_CARGO — ICN→NRT (단거리)
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'AIR' AND origin_port_id = v_port_icn AND dest_port_id = v_port_nrt AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'AIR', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":2.20,"min_charge":55},{"weight_min":45,"unit_price":1.80,"min_charge":81},{"weight_min":100,"unit_price":1.50,"min_charge":150},{"weight_min":500,"unit_price":1.20,"min_charge":600}],"cbm_slabs":[{"cbm_min":0,"cbm_price":367.40,"min_charge":55}]}'::jsonb,
      v_port_icn, v_port_nrt, CURRENT_DATE, 1.00, 15.0, 5.0);
  END IF;

  -- KAL_CARGO — ICN→FRA (장거리)
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'AIR' AND origin_port_id = v_port_icn AND dest_port_id = v_port_fra AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'AIR', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":4.20,"min_charge":90},{"weight_min":45,"unit_price":3.40,"min_charge":153},{"weight_min":100,"unit_price":3.00,"min_charge":300},{"weight_min":300,"unit_price":2.60,"min_charge":780},{"weight_min":500,"unit_price":2.30,"min_charge":1150}],"cbm_slabs":[{"cbm_min":0,"cbm_price":701.40,"min_charge":90}]}'::jsonb,
      v_port_icn, v_port_fra, CURRENT_DATE, 1.80, 15.0, 5.0);
  END IF;

  -- ========================================================================
  -- AAR_CARGO — ICN→LAX 항공
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'AAR_CARGO';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'AIR' AND origin_port_id = v_port_icn AND dest_port_id = v_port_lax AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'AIR', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":3.30,"min_charge":70},{"weight_min":45,"unit_price":2.70,"min_charge":121},{"weight_min":100,"unit_price":2.40,"min_charge":240},{"weight_min":300,"unit_price":2.10,"min_charge":630},{"weight_min":500,"unit_price":1.80,"min_charge":900}],"cbm_slabs":[{"cbm_min":0,"cbm_price":551.10,"min_charge":70}]}'::jsonb,
      v_port_icn, v_port_lax, CURRENT_DATE, 1.40, 15.0, 5.0);
  END IF;

  -- ========================================================================
  -- FEDEX — ICN→LAX 특송
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'FEDEX';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'EXP' AND origin_port_id = v_port_icn AND dest_port_id = v_port_lax AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'EXP', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":12.00,"min_charge":45},{"weight_min":10,"unit_price":9.50,"min_charge":95},{"weight_min":50,"unit_price":7.80,"min_charge":390},{"weight_min":100,"unit_price":6.50,"min_charge":650},{"weight_min":500,"unit_price":5.20,"min_charge":2600}],"cbm_slabs":[{"cbm_min":0,"cbm_price":2004.00,"min_charge":45}]}'::jsonb,
      v_port_icn, v_port_lax, CURRENT_DATE, 6.00, 12.0, 5.0);
  END IF;

  -- FEDEX — ICN→SIN 특송
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'EXP' AND origin_port_id = v_port_icn AND dest_port_id = v_port_sin AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'EXP', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":10.50,"min_charge":40},{"weight_min":10,"unit_price":8.50,"min_charge":85},{"weight_min":50,"unit_price":6.80,"min_charge":340},{"weight_min":100,"unit_price":5.50,"min_charge":550},{"weight_min":500,"unit_price":4.50,"min_charge":2250}],"cbm_slabs":[{"cbm_min":0,"cbm_price":1753.50,"min_charge":40}]}'::jsonb,
      v_port_icn, v_port_sin, CURRENT_DATE, 5.50, 12.0, 5.0);
  END IF;

  -- ========================================================================
  -- DHL — ICN→LAX 특송
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'DHL';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'EXP' AND origin_port_id = v_port_icn AND dest_port_id = v_port_lax AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'EXP', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":11.50,"min_charge":42},{"weight_min":10,"unit_price":9.00,"min_charge":90},{"weight_min":50,"unit_price":7.50,"min_charge":375},{"weight_min":100,"unit_price":6.00,"min_charge":600},{"weight_min":500,"unit_price":4.80,"min_charge":2400}],"cbm_slabs":[{"cbm_min":0,"cbm_price":1920.50,"min_charge":42}]}'::jsonb,
      v_port_icn, v_port_lax, CURRENT_DATE, 5.80, 12.0, 5.0);
  END IF;

  -- ========================================================================
  -- HMM — PUS→LGB 해상 LCL
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'HMM';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'SEA' AND origin_port_id = v_port_pus AND dest_port_id = v_port_lgb AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'SEA', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":2.50,"min_charge":100},{"weight_min":1000,"unit_price":1.80,"min_charge":1800},{"weight_min":5000,"unit_price":1.20,"min_charge":6000},{"weight_min":10000,"unit_price":0.85,"min_charge":8500}],"cbm_slabs":[{"cbm_min":0,"cbm_price":65.00,"min_charge":100},{"cbm_min":5,"cbm_price":52.00,"min_charge":260},{"cbm_min":15,"cbm_price":42.00,"min_charge":630}]}'::jsonb,
      v_port_pus, v_port_lgb, CURRENT_DATE, 0.70, 15.0, 5.0);
  END IF;

  -- ========================================================================
  -- MSC — PUS→LGB 해상 LCL
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'MSC';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'SEA' AND origin_port_id = v_port_pus AND dest_port_id = v_port_lgb AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'SEA', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":2.30,"min_charge":90},{"weight_min":1000,"unit_price":1.60,"min_charge":1600},{"weight_min":5000,"unit_price":1.10,"min_charge":5500},{"weight_min":10000,"unit_price":0.75,"min_charge":7500}],"cbm_slabs":[{"cbm_min":0,"cbm_price":60.00,"min_charge":90},{"cbm_min":5,"cbm_price":48.00,"min_charge":240},{"cbm_min":15,"cbm_price":38.00,"min_charge":570}]}'::jsonb,
      v_port_pus, v_port_lgb, CURRENT_DATE, 0.65, 15.0, 5.0);
  END IF;

  -- MSC — PUS→SIN (근거리)
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'SEA' AND origin_port_id = v_port_pus AND dest_port_id = v_port_sin AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'SEA', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":1.50,"min_charge":70},{"weight_min":1000,"unit_price":1.00,"min_charge":1000},{"weight_min":5000,"unit_price":0.70,"min_charge":3500},{"weight_min":10000,"unit_price":0.50,"min_charge":5000}],"cbm_slabs":[{"cbm_min":0,"cbm_price":38.00,"min_charge":70},{"cbm_min":5,"cbm_price":30.00,"min_charge":150},{"cbm_min":15,"cbm_price":24.00,"min_charge":360}]}'::jsonb,
      v_port_pus, v_port_sin, CURRENT_DATE, 0.45, 15.0, 5.0);
  END IF;

  -- ========================================================================
  -- EVERGREEN — PUS→LGB 해상 LCL
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'EVERGREEN';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'SEA' AND origin_port_id = v_port_pus AND dest_port_id = v_port_lgb AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'SEA', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":2.40,"min_charge":95},{"weight_min":1000,"unit_price":1.70,"min_charge":1700},{"weight_min":5000,"unit_price":1.15,"min_charge":5750},{"weight_min":10000,"unit_price":0.80,"min_charge":8000}],"cbm_slabs":[{"cbm_min":0,"cbm_price":62.00,"min_charge":95},{"cbm_min":5,"cbm_price":50.00,"min_charge":250},{"cbm_min":15,"cbm_price":40.00,"min_charge":600}]}'::jsonb,
      v_port_pus, v_port_lgb, CURRENT_DATE, 0.68, 15.0, 5.0);
  END IF;

  -- ========================================================================
  -- ZENITH_AIR — ICN→LAX (기존 시드 대체: 더 현실적인 요율)
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'ZENITH_AIR';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'AIR' AND origin_port_id = v_port_icn AND dest_port_id = v_port_lax AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'AIR', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":3.80,"min_charge":80},{"weight_min":45,"unit_price":3.00,"min_charge":135},{"weight_min":100,"unit_price":2.70,"min_charge":270},{"weight_min":300,"unit_price":2.40,"min_charge":720},{"weight_min":500,"unit_price":2.10,"min_charge":1050}],"cbm_slabs":[{"cbm_min":0,"cbm_price":634.60,"min_charge":80}]}'::jsonb,
      v_port_icn, v_port_lax, CURRENT_DATE, 1.60, 15.0, 5.0);
  END IF;

  -- ZENITH_AIR — ICN→SIN
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'AIR' AND origin_port_id = v_port_icn AND dest_port_id = v_port_sin AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'AIR', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":2.80,"min_charge":60},{"weight_min":45,"unit_price":2.20,"min_charge":99},{"weight_min":100,"unit_price":1.90,"min_charge":190},{"weight_min":300,"unit_price":1.60,"min_charge":480},{"weight_min":500,"unit_price":1.40,"min_charge":700}],"cbm_slabs":[{"cbm_min":0,"cbm_price":467.60,"min_charge":60}]}'::jsonb,
      v_port_icn, v_port_sin, CURRENT_DATE, 1.20, 15.0, 5.0);
  END IF;

  -- ========================================================================
  -- ZENITH_SEA — PUS→LGB (기존 시드 대체)
  -- ========================================================================
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'ZENITH_SEA';
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'SEA' AND origin_port_id = v_port_pus AND dest_port_id = v_port_lgb AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'SEA', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":2.60,"min_charge":100},{"weight_min":1000,"unit_price":1.90,"min_charge":1900},{"weight_min":5000,"unit_price":1.30,"min_charge":6500},{"weight_min":10000,"unit_price":0.90,"min_charge":9000}],"cbm_slabs":[{"cbm_min":0,"cbm_price":68.00,"min_charge":100},{"cbm_min":5,"cbm_price":55.00,"min_charge":275},{"cbm_min":15,"cbm_price":45.00,"min_charge":675}]}'::jsonb,
      v_port_pus, v_port_lgb, CURRENT_DATE, 0.75, 15.0, 5.0);
  END IF;

  -- ZENITH_SEA — PUS→SIN
  IF NOT EXISTS (SELECT 1 FROM public.zen_rate_cards WHERE carrier_id = v_carrier_id AND transport_mode = 'SEA' AND origin_port_id = v_port_pus AND dest_port_id = v_port_sin AND is_active = true) THEN
    INSERT INTO public.zen_rate_cards (carrier_id, transport_mode, currency, tiers, origin_port_id, dest_port_id, valid_from, carrier_cost, margin_rate, platform_fee_rate)
    VALUES (v_carrier_id, 'SEA', 'USD',
      '{"weight_slabs":[{"weight_min":0,"unit_price":1.60,"min_charge":75},{"weight_min":1000,"unit_price":1.10,"min_charge":1100},{"weight_min":5000,"unit_price":0.75,"min_charge":3750},{"weight_min":10000,"unit_price":0.55,"min_charge":5500}],"cbm_slabs":[{"cbm_min":0,"cbm_price":40.00,"min_charge":75},{"cbm_min":5,"cbm_price":32.00,"min_charge":160},{"cbm_min":15,"cbm_price":26.00,"min_charge":390}]}'::jsonb,
      v_port_pus, v_port_sin, CURRENT_DATE, 0.50, 15.0, 5.0);
  END IF;

END $$;

-- ============================================================================
-- 3. Surcharges (zen_surcharges) — carrier-level
-- ============================================================================
DO $$
DECLARE
  v_carrier_id UUID;
BEGIN
  -- KAL_CARGO
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'KAL_CARGO';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'FSC' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'FSC', 'AIR', 'PERCENT', 28.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'SSC', 'AIR', 'FLAT', 12.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'AIR', 'PER_KG', 0.35, 'USD', CURRENT_DATE);
  END IF;

  -- AAR_CARGO
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'AAR_CARGO';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'FSC' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'FSC', 'AIR', 'PERCENT', 26.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'SSC', 'AIR', 'FLAT', 10.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'AIR', 'PER_KG', 0.30, 'USD', CURRENT_DATE);
  END IF;

  -- FEDEX
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'FEDEX';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'FSC' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'FSC', 'EXP', 'PERCENT', 20.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'DTP', 'EXP', 'PERCENT', 8.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'RST', 'EXP', 'FLAT', 15.0, 'USD', CURRENT_DATE);
  END IF;

  -- DHL
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'DHL';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'FSC' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'FSC', 'EXP', 'PERCENT', 22.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'DTP', 'EXP', 'PERCENT', 7.5, 'USD', CURRENT_DATE),
      (v_carrier_id, 'RST', 'EXP', 'FLAT', 14.0, 'USD', CURRENT_DATE);
  END IF;

  -- HMM
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'HMM';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'BAF' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'BAF', 'SEA', 'PERCENT', 18.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'SEA', 'FLAT', 185.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'CFD', 'SEA', 'FLAT', 75.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'DOC', 'SEA', 'FLAT', 65.0, 'USD', CURRENT_DATE);
  END IF;

  -- MSC
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'MSC';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'BAF' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'BAF', 'SEA', 'PERCENT', 16.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'SEA', 'FLAT', 175.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'CFD', 'SEA', 'FLAT', 70.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'DOC', 'SEA', 'FLAT', 60.0, 'USD', CURRENT_DATE);
  END IF;

  -- EVERGREEN
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'EVERGREEN';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'BAF' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'BAF', 'SEA', 'PERCENT', 17.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'SEA', 'FLAT', 180.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'CFD', 'SEA', 'FLAT', 72.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'DOC', 'SEA', 'FLAT', 62.0, 'USD', CURRENT_DATE);
  END IF;

  -- ZENITH_AIR
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'ZENITH_AIR';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'FSC' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'FSC', 'AIR', 'PERCENT', 25.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'SSC', 'AIR', 'FLAT', 10.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'AIR', 'PER_KG', 0.30, 'USD', CURRENT_DATE);
  END IF;

  -- ZENITH_SEA
  SELECT id INTO v_carrier_id FROM public.zen_carriers WHERE code = 'ZENITH_SEA';
  IF NOT EXISTS (SELECT 1 FROM public.zen_surcharges WHERE carrier_id = v_carrier_id AND surcharge_type = 'BAF' AND is_active = true) THEN
    INSERT INTO public.zen_surcharges (carrier_id, surcharge_type, transport_mode, rate_type, amount, currency, valid_from) VALUES
      (v_carrier_id, 'BAF', 'SEA', 'PERCENT', 20.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'THC', 'SEA', 'FLAT', 180.0, 'USD', CURRENT_DATE),
      (v_carrier_id, 'DOC', 'SEA', 'FLAT', 60.0, 'USD', CURRENT_DATE);
  END IF;
END $$;

-- ============================================================================
-- 4. Route Network (zen_route_network)
-- origin_port_id → zen_ports.code 로 변환하여 삽입
-- ============================================================================
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT rc.carrier_id, p_from.code AS from_code, p_to.code AS to_code, rc.transport_mode
    FROM public.zen_rate_cards rc
    JOIN public.zen_ports p_from ON p_from.id = rc.origin_port_id
    JOIN public.zen_ports p_to ON p_to.id = rc.dest_port_id
    WHERE rc.origin_port_id IS NOT NULL AND rc.dest_port_id IS NOT NULL AND rc.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.zen_route_network rn
        WHERE rn.carrier_id = rc.carrier_id
          AND rn.from_port_id = p_from.code
          AND rn.to_port_id = p_to.code
          AND rn.transport_mode = rc.transport_mode
      )
  LOOP
    INSERT INTO public.zen_route_network (carrier_id, from_port_id, to_port_id, transport_mode, transit_days, is_active)
    VALUES (v_rec.carrier_id, v_rec.from_code, v_rec.to_code, v_rec.transport_mode,
      CASE v_rec.transport_mode
        WHEN 'AIR' THEN 2
        WHEN 'EXP' THEN 1
        WHEN 'SEA' THEN 14
        WHEN 'LAND' THEN 5
        ELSE 3
      END,
      true)
    ON CONFLICT (carrier_id, from_port_id, to_port_id, transport_mode) DO UPDATE
      SET is_active = true;
  END LOOP;
END $$;
