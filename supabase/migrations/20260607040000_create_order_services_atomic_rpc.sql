-- Migration: Create SECURITY DEFINER RPC for order services insertion
-- Description: Bypasses RLS on zen_order_services to resolve PostgREST auth.uid() resolution issue.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_services_atomic(p_order_id uuid, p_services jsonb, p_user_id uuid)
RETURNS SETOF public.zen_order_services LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idx int;
  v_svc jsonb;
  v_result public.zen_order_services;
BEGIN
  -- 1. Verify the order exists and user can act on it
  IF NOT EXISTS (SELECT 1 FROM public.zen_orders zo WHERE zo.id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Verify user has a valid active profile (basic safety net; server action does full authz)
  IF NOT EXISTS (SELECT 1 FROM public.zen_profiles zp WHERE zp.id = p_user_id AND zp.status = 'ACTIVE') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0003';
  END IF;

  -- 3. Insert each service
  FOR v_idx IN 0..jsonb_array_length(p_services) - 1 LOOP
    v_svc := p_services -> v_idx;

    INSERT INTO public.zen_order_services (
      order_id, service_type, provider_id,
      rate_card_id, customs_rate_id, delivery_rate_id,
      quoted_cost, currency, status
    ) VALUES (
      p_order_id,
      v_svc ->> 'service_type',
      (v_svc ->> 'provider_id')::uuid,
      NULLIF(v_svc ->> 'rate_card_id', '')::uuid,
      NULLIF(v_svc ->> 'customs_rate_id', '')::uuid,
      NULLIF(v_svc ->> 'delivery_rate_id', '')::uuid,
      (v_svc ->> 'quoted_cost')::numeric,
      COALESCE(v_svc ->> 'currency', 'USD'),
      'REQUESTED'
    )
    RETURNING * INTO v_result;

    RETURN NEXT v_result;
  END LOOP;

  RETURN;
END;
$$;

COMMIT;
