-- Migration: Create atomic transaction RPCs for order status update and invoice payment
-- Timestamp: 20260520224100
-- Task ID: TASK-027 / IMP-019

BEGIN;

-- 1. update_order_status_atomic
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
  p_order_id UUID,
  p_prev_status VARCHAR,
  p_next_status VARCHAR,
  p_reason TEXT,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_current_status VARCHAR;
  v_shipper_id UUID;
  v_master_order_id UUID;
  v_item RECORD;
  v_inv_id UUID;
  v_inv_on_hand NUMERIC;
  v_inv_reserved NUMERIC;
  v_new_on_hand NUMERIC;
  v_new_reserved NUMERIC;
  v_transaction_type TEXT;
  v_change_qty NUMERIC;
  v_result_qty NUMERIC;
  v_remarks TEXT;
BEGIN
  -- 1. Lock the order row and fetch current status, shipper_id, master_order_id
  SELECT status, shipper_id, master_order_id INTO v_current_status, v_shipper_id, v_master_order_id
  FROM public.zen_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. Check master connection guard
  IF v_master_order_id IS NOT NULL THEN
    RAISE EXCEPTION '⚠️ 마스터 오더에 결합된 상태입니다. 수정을 위해 먼저 마스터를 해체(Dissolve)하십시오.';
  END IF;

  -- 3. Validate status has not changed concurrently
  IF v_current_status <> p_prev_status THEN
    RAISE EXCEPTION 'Race Condition detected: Current status (%) does not match expected status (%)', v_current_status, p_prev_status;
  END IF;

  -- 4. Update order status
  UPDATE public.zen_orders
  SET status = p_next_status, updated_at = NOW()
  WHERE id = p_order_id;

  -- 5. Insert order status history
  INSERT INTO public.order_status_history (
    order_id,
    prev_status,
    next_status,
    reason,
    changed_by,
    created_at
  ) VALUES (
    p_order_id,
    v_current_status,
    p_next_status,
    p_reason,
    p_user_id,
    NOW()
  );

  -- 6. Sync inventory
  -- Loop through order items
  FOR v_item IN
    SELECT sku_code, quantity
    FROM public.zen_order_items
    WHERE order_id = p_order_id
  LOOP
    IF v_item.sku_code IS NOT NULL AND v_item.quantity > 0 THEN
      -- Get inventory row for this org and SKU, locking it for update
      SELECT id, on_hand_qty, reserved_qty INTO v_inv_id, v_inv_on_hand, v_inv_reserved
      FROM public.zen_inventory
      WHERE org_id = v_shipper_id AND sku_code = v_item.sku_code
      FOR UPDATE;

      -- If inventory row exists, update it and insert history
      IF v_inv_id IS NOT NULL THEN
        v_new_on_hand := v_inv_on_hand;
        v_new_reserved := v_inv_reserved;
        v_transaction_type := NULL;
        v_change_qty := 0;
        v_remarks := NULL;

        -- Match next status to perform calculations
        IF p_next_status = 'WAREHOUSED' THEN
          v_new_on_hand := v_inv_on_hand + v_item.quantity;
          v_transaction_type := 'INBOUND';
          v_change_qty := v_item.quantity;
          v_result_qty := v_new_on_hand;
          v_remarks := 'Order Warehoused: ' || p_order_id;

        ELSIF p_next_status = 'REGISTERED' THEN
          v_new_reserved := v_inv_reserved + v_item.quantity;
          v_transaction_type := 'RESERVATION';
          v_change_qty := v_item.quantity;
          v_result_qty := v_inv_on_hand;
          v_remarks := 'Order Registered: ' || p_order_id;

        ELSIF p_next_status = 'RELEASED' OR p_next_status = 'IN_TRANSIT' THEN
          v_new_on_hand := v_inv_on_hand - v_item.quantity;
          v_new_reserved := GREATEST(0, v_inv_reserved - v_item.quantity);
          v_transaction_type := 'OUTBOUND';
          v_change_qty := -v_item.quantity;
          v_result_qty := v_new_on_hand;
          v_remarks := 'Order ' || p_next_status || ': ' || p_order_id;

        ELSIF p_next_status = 'CANCELED' THEN
          IF v_current_status = 'WAREHOUSED' OR v_current_status = 'PACKED' THEN
            v_new_on_hand := GREATEST(0, v_inv_on_hand - v_item.quantity);
            v_new_reserved := GREATEST(0, v_inv_reserved - v_item.quantity);
            v_transaction_type := 'ADJUSTMENT';
            v_change_qty := -v_item.quantity;
            v_result_qty := v_new_on_hand;
            v_remarks := 'Order Cancelled (Warehoused/Packed Revert) from ' || v_current_status || ': ' || p_order_id;

          ELSIF v_current_status = 'RELEASED' OR v_current_status = 'IN_TRANSIT' OR v_current_status = 'DELIVERED' OR v_current_status = 'CLAIMED' THEN
            v_new_on_hand := v_inv_on_hand + v_item.quantity;
            v_transaction_type := 'INBOUND';
            v_change_qty := v_item.quantity;
            v_result_qty := v_new_on_hand;
            v_remarks := 'Order Cancelled (Released/InTransit Revert) from ' || v_current_status || ': ' || p_order_id;

          ELSE
            v_new_reserved := GREATEST(0, v_inv_reserved - v_item.quantity);
            v_transaction_type := 'RESERVATION_CANCEL';
            v_change_qty := -v_item.quantity;
            v_result_qty := v_inv_on_hand;
            v_remarks := 'Order Cancelled: ' || p_order_id;
          END IF;
        END IF;

        -- Update and insert history if we resolved a transaction type
        IF v_transaction_type IS NOT NULL THEN
          UPDATE public.zen_inventory
          SET on_hand_qty = v_new_on_hand, reserved_qty = v_new_reserved, updated_at = NOW()
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
            v_shipper_id,
            v_transaction_type,
            v_change_qty,
            v_result_qty,
            p_order_id,
            v_remarks,
            p_user_id,
            NOW()
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 2. pay_invoice_from_wallet_atomic
CREATE OR REPLACE FUNCTION public.pay_invoice_from_wallet_atomic(
  p_invoice_id UUID,
  p_profile_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_invoice_no VARCHAR;
  v_total_amount NUMERIC;
  v_shipper_id UUID;
  v_invoice_status VARCHAR;
  v_wallet_id UUID;
  v_wallet_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Lock invoice row and fetch data
  SELECT invoice_no, total_amount, shipper_id, status 
  INTO v_invoice_no, v_total_amount, v_shipper_id, v_invoice_status
  FROM public.zen_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '인보이스를 찾을 수 없습니다.';
  END IF;

  IF v_invoice_status = 'PAID' THEN
    RAISE EXCEPTION '이미 결제된 인보이스입니다.';
  END IF;

  -- 2. Lock wallet row and fetch data
  SELECT id, balance INTO v_wallet_id, v_wallet_balance
  FROM public.zen_wallet
  WHERE org_id = v_shipper_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '지갑을 찾을 수 없습니다.';
  END IF;

  -- 3. Check balance
  IF v_wallet_balance < v_total_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- 4. Calculate new balance and update wallet
  v_new_balance := v_wallet_balance - v_total_amount;

  UPDATE public.zen_wallet
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 5. Insert wallet transaction
  INSERT INTO public.zen_wallet_transactions (
    wallet_id,
    type,
    amount,
    status,
    reference_id,
    description,
    created_by,
    created_at
  ) VALUES (
    v_wallet_id,
    'DEDUCT',
    v_total_amount,
    'COMPLETED',
    p_invoice_id,
    'Invoice Payment: ' || v_invoice_no,
    p_profile_id,
    NOW()
  );

  -- 6. Update invoice status
  UPDATE public.zen_invoices
  SET status = 'PAID',
      payment_method = 'WALLET',
      paid_amount = v_total_amount,
      paid_at = NOW()
  WHERE id = p_invoice_id;

  RETURN v_new_balance;
END;
$$;

COMMIT;
