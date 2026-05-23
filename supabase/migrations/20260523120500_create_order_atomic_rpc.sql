CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_payload JSONB,
  p_user_id UUID,
  p_org_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order_id UUID;
  v_order_no TEXT;
  v_year TEXT;
  v_prefix TEXT := 'ZEN';
  v_pkg RECORD;
  v_item RECORD;
  v_pkg_id UUID;
  v_order_result JSONB;
  v_inv_id UUID;
  v_new_on_hand NUMERIC;
  v_new_reserved NUMERIC;
BEGIN
  -- 1. order_no 생성
  v_year := to_char(NOW(), 'YYYY');
  SELECT public.get_next_order_sequence(v_year, v_prefix) INTO v_order_no;

  -- 2. zen_orders Header 삽입
  INSERT INTO public.zen_orders (
    order_no,
    order_type,
    shipper_id,
    origin_port_id,
    dest_port_id,
    description,
    shipper_contact_name,
    shipper_contact_phone,
    shipper_contact_email,
    recipient_name,
    recipient_address,
    recipient_phone,
    recipient_zipcode,
    recipient_pccc,
    recipient_email,
    delivery_notes,
    transport_mode,
    estimated_cost,
    special_cargo_type, -- IMP-076 추가
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_order_no,
    p_payload->>'order_type',
    (p_payload->>'shipper_id')::UUID,
    (p_payload->>'origin_port_id')::UUID,
    (p_payload->>'dest_port_id')::UUID,
    p_payload->>'description',
    p_payload->>'shipper_contact_name',
    p_payload->>'shipper_contact_phone',
    p_payload->>'shipper_contact_email',
    p_payload->>'recipient_name',
    p_payload->>'recipient_address',
    p_payload->>'recipient_phone',
    p_payload->>'recipient_zipcode',
    p_payload->>'recipient_pccc',
    p_payload->>'recipient_email',
    p_payload->>'delivery_notes',
    p_payload->>'transport_mode',
    (p_payload->>'estimated_cost')::NUMERIC,
    COALESCE(p_payload->>'special_cargo_type', 'NONE'), -- IMP-076 추가
    'REGISTERED',
    p_user_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_order_id;

  -- 3. zen_tracking_configs 삽입
  INSERT INTO public.zen_tracking_configs (
    order_id,
    tracking_no,
    provider_type,
    provider_name
  ) VALUES (
    v_order_id,
    'ZN-' || v_order_no,
    'VIRTUAL',
    'ZSim (Virtual)'
  );

  -- 4. Packages 및 Items 삽입
  FOR v_pkg IN SELECT * FROM jsonb_to_recordset(p_payload->'packages') AS x(
    packing_unit TEXT,
    packing_count INT,
    length NUMERIC,
    width NUMERIC,
    height NUMERIC,
    gross_weight NUMERIC,
    volume NUMERIC,
    items JSONB
  ) LOOP
    INSERT INTO public.zen_order_packages (
      order_id,
      packing_unit,
      packing_count,
      length,
      width,
      height,
      gross_weight,
      volume,
      created_at
    ) VALUES (
      v_order_id,
      v_pkg.packing_unit,
      v_pkg.packing_count,
      v_pkg.length,
      v_pkg.width,
      v_pkg.height,
      v_pkg.gross_weight,
      v_pkg.volume,
      NOW()
    ) RETURNING id INTO v_pkg_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_pkg.items) AS y(
      sku_code TEXT,
      item_name TEXT,
      quantity INT,
      unit_price NUMERIC,
      currency TEXT,
      hs_code TEXT,
      item_packing_unit TEXT
    ) LOOP
      INSERT INTO public.zen_order_items (
        order_id,
        package_id,
        sku_code,
        item_name,
        quantity,
        unit_price,
        currency,
        hs_code,
        item_packing_unit,
        created_at
      ) VALUES (
        v_order_id,
        v_pkg_id,
        v_item.sku_code,
        v_item.item_name,
        v_item.quantity,
        v_item.unit_price,
        COALESCE(v_item.currency, 'USD'),
        v_item.hs_code,
        v_item.item_packing_unit,
        NOW()
      );
    END LOOP;
  END LOOP;

  -- 5. 인벤토리 예약 동기화
  FOR v_item IN
    SELECT sku_code, quantity
    FROM public.zen_order_items
    WHERE order_id = v_order_id
  LOOP
    IF v_item.sku_code IS NOT NULL AND v_item.quantity > 0 THEN
      SELECT id, on_hand_qty, reserved_qty INTO v_inv_id, v_new_on_hand, v_new_reserved
      FROM public.zen_inventory
      WHERE org_id = (p_payload->>'shipper_id')::UUID AND sku_code = v_item.sku_code
      FOR UPDATE;

      IF v_inv_id IS NOT NULL THEN
        UPDATE public.zen_inventory
        SET reserved_qty = reserved_qty + v_item.quantity, updated_at = NOW()
        WHERE id = v_inv_id;

        INSERT INTO public.zen_inventory_history (
          inventory_id,
          org_id,
          transaction_type,
          change_qty,
          result_qty,
          reference_id,
          remarks,
          created_by,
          created_at
        ) VALUES (
          v_inv_id,
          (p_payload->>'shipper_id')::UUID,
          'RESERVATION',
          v_item.quantity,
          v_new_on_hand,
          v_order_id,
          'Order Registered (Atomic RPC): ' || v_order_id,
          p_user_id,
          NOW()
        );
      END IF;
    END IF;
  END LOOP;

  -- 6. 초기 order status history 생성
  INSERT INTO public.order_status_history (
    order_id,
    prev_status,
    next_status,
    reason,
    changed_by,
    created_at
  ) VALUES (
    v_order_id,
    NULL,
    'REGISTERED',
    'Order Registered (Atomic RPC)',
    p_user_id,
    NOW()
  );

  -- 7. 결과 JSONB 리턴
  SELECT row_to_json(o) INTO v_order_result
  FROM public.zen_orders o
  WHERE id = v_order_id;

  RETURN v_order_result;
END;
$$;
