-- ============================================================================
-- TASK-B-381 (Issue #1459) M3 — RPC finalize_ups_settlement_run
-- 설계: task file §2-1(6단계)·§2-3·§2-9·§2-12 (M3)
-- 적용 순서: M1 → M2 → M3 (앱 배포 전). 운영 적용은 Aiden(Edward 승인, R-14).
-- 원자성: run + amounts + charges + 오더 SETTLED 를 한 함수(트랜잭션)에서 처리.
-- 되돌리기: 아래 ROLLBACK 블록(DROP FUNCTION).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.finalize_ups_settlement_run(
  p_order_id         uuid,
  p_charge_weight_kg numeric,
  p_amounts          jsonb,
  p_charges          jsonb
)
RETURNS TABLE (run_id uuid, version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role          text;
  v_order         record;
  v_prev_id       uuid;
  v_prev_version  integer;
  v_new_version   integer;
  v_run_id        uuid;
  v_amount_count  integer;
  v_bad_payload   integer;
BEGIN
  -- ── 1. 권한: admin 3역할만 (actor 파라미터 없음) ──
  SELECT p.role INTO v_role FROM public.zen_profiles p WHERE p.id = auth.uid();
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
  IF v_role NOT IN ('ADMIN', 'MANAGER', 'ZENITH_SUPER_ADMIN') THEN
    RAISE EXCEPTION 'permission_denied: role=%', v_role;
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- ── 2. 오더 가드(잠금) ──
  SELECT o.id, o.transport_mode, o.status, o.cost_settlement_status
    INTO v_order
  FROM public.zen_orders o
  WHERE o.id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF v_order.transport_mode <> 'UPS' THEN
    RAISE EXCEPTION 'not_ups_order';
  END IF;
  IF v_order.status <> 'DELIVERED' THEN
    RAISE EXCEPTION 'ups_actual_cost_status_invalid: status=%', v_order.status;
  END IF;
  -- ── 3. payload 검증: 금액 2 tier, 항목은 tier별 line_no 유일 ──
  IF p_charge_weight_kg IS NULL OR p_charge_weight_kg < 0 THEN
    RAISE EXCEPTION 'invalid_run_payload: charge_weight';
  END IF;
  IF p_amounts IS NULL OR jsonb_typeof(p_amounts) <> 'array'
     OR jsonb_array_length(p_amounts) <> 2 THEN
    RAISE EXCEPTION 'invalid_run_payload: amounts';
  END IF;
  IF p_charges IS NULL OR jsonb_typeof(p_charges) <> 'array' THEN
    RAISE EXCEPTION 'invalid_run_payload: charges';
  END IF;

  SELECT count(*) INTO v_amount_count
  FROM jsonb_to_recordset(p_amounts) AS x(
    tier text, base_freight numeric, fuel_surcharge numeric, surge_fee numeric,
    other_charges numeric, freight_adjustment numeric, settlement_charges_total numeric, line_total numeric
  )
  WHERE x.tier IN ('ADMIN_TO_AGENCY','SHIPPER');
  IF v_amount_count <> 2 OR (
    SELECT count(DISTINCT x.tier) FROM jsonb_to_recordset(p_amounts) AS x(tier text)
  ) <> 2 THEN
    RAISE EXCEPTION 'invalid_run_payload: tier';
  END IF;

  -- 금액 불변식: line_total = 4개 합 + 조정 + 부가항목 합(2자리 반올림), 부가항목 합 = 항목 amount 합
  SELECT count(*) INTO v_bad_payload
  FROM jsonb_to_recordset(p_amounts) AS x(
    tier text, base_freight numeric, fuel_surcharge numeric, surge_fee numeric,
    other_charges numeric, freight_adjustment numeric, settlement_charges_total numeric, line_total numeric
  )
  WHERE x.tier IN ('ADMIN_TO_AGENCY','SHIPPER')
    AND (
      x.line_total IS DISTINCT FROM round(
        coalesce(x.base_freight,0) + coalesce(x.fuel_surcharge,0) + coalesce(x.surge_fee,0)
        + coalesce(x.other_charges,0) + coalesce(x.freight_adjustment,0)
        + coalesce(x.settlement_charges_total,0), 2)
      OR x.settlement_charges_total IS DISTINCT FROM coalesce((
           SELECT round(sum(c.amount), 2)
           FROM jsonb_to_recordset(p_charges) AS c(tier text, line_no integer, name text, amount numeric)
           WHERE c.tier = x.tier
         ), 0)
    );
  IF v_bad_payload > 0 THEN
    RAISE EXCEPTION 'invalid_run_payload: totals';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_charges) AS c(tier text, line_no integer, name text, amount numeric)
    WHERE c.tier NOT IN ('ADMIN_TO_AGENCY','SHIPPER')
       OR c.line_no IS NULL OR c.line_no < 1
       OR c.name IS NULL OR btrim(c.name) = ''
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_charges) AS c(tier text, line_no integer, name text, amount numeric)
    GROUP BY c.tier, c.line_no
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'invalid_run_payload: charges';
  END IF;

  -- ── 4. 멱등: 같은 입력이면 새 version을 만들지 않는다 ──
  SELECT r.id, r.version INTO v_prev_id, v_prev_version
  FROM public.zen_ups_settlement_runs r
  WHERE r.order_id = p_order_id
  ORDER BY r.version DESC
  LIMIT 1;

  IF v_prev_id IS NOT NULL THEN
    IF (SELECT round(r.charge_weight_kg,2) FROM public.zen_ups_settlement_runs r WHERE r.id = v_prev_id)
         IS NOT DISTINCT FROM round(p_charge_weight_kg, 2)
       AND (
         SELECT jsonb_agg(jsonb_build_array(
                  a.tier, a.base_freight, a.fuel_surcharge, a.surge_fee, a.other_charges,
                  a.freight_adjustment, a.settlement_charges_total, a.line_total) ORDER BY a.tier)
         FROM public.zen_ups_settlement_run_amounts a WHERE a.run_id = v_prev_id
       ) IS NOT DISTINCT FROM (
         SELECT jsonb_agg(jsonb_build_array(
                  x.tier, round(coalesce(x.base_freight,0),2), round(coalesce(x.fuel_surcharge,0),2), round(coalesce(x.surge_fee,0),2),
                  round(coalesce(x.other_charges,0),2), round(coalesce(x.freight_adjustment,0),2),
                  round(coalesce(x.settlement_charges_total,0),2), round(coalesce(x.line_total,0),2)) ORDER BY x.tier)
         FROM jsonb_to_recordset(p_amounts) AS x(
           tier text, base_freight numeric, fuel_surcharge numeric, surge_fee numeric,
           other_charges numeric, freight_adjustment numeric, settlement_charges_total numeric, line_total numeric)
         WHERE x.tier IN ('ADMIN_TO_AGENCY','SHIPPER')
       )
       AND (
         SELECT jsonb_agg(jsonb_build_array(c.tier, c.line_no, btrim(c.name), round(c.amount,2)) ORDER BY c.tier, c.line_no)
         FROM public.zen_ups_settlement_run_charges c WHERE c.run_id = v_prev_id
       ) IS NOT DISTINCT FROM (
         SELECT jsonb_agg(jsonb_build_array(c.tier, c.line_no, btrim(c.name), round(coalesce(c.amount,0),2)) ORDER BY c.tier, c.line_no)
         FROM jsonb_to_recordset(p_charges) AS c(tier text, line_no integer, name text, amount numeric)
         WHERE c.tier IN ('ADMIN_TO_AGENCY','SHIPPER')
       )
    THEN
      -- 같은 입력 재호출: run은 불변이므로 새 version을 만들지 않는다.
      -- 단, unmark 등으로 오더가 NOT_SETTLED로 돌아간 경우에는 SETTLED를 복구한다(인보이스 방어 재적용).
      IF v_order.cost_settlement_status = 'NOT_SETTLED' THEN
        IF EXISTS (
          SELECT 1 FROM public.zen_invoices i
          WHERE i.status = 'PAID'
            AND i.metadata->>'source_order_id' = p_order_id::text
        ) THEN
          RAISE EXCEPTION 'paid_invoice_exists';
        END IF;
        IF EXISTS (
          SELECT 1 FROM public.zen_invoices i
          WHERE i.status <> 'CANCELED'
            AND i.metadata->>'source_order_id' = p_order_id::text
        ) THEN
          RAISE EXCEPTION 'ups_invoice_exists';
        END IF;
        UPDATE public.zen_orders o
        SET cost_settlement_status = 'SETTLED',
            cost_settled_at = now(),
            cost_settled_by = auth.uid()
        WHERE o.id = p_order_id
          AND o.cost_settlement_status = 'NOT_SETTLED';
      END IF;
      RETURN QUERY SELECT v_prev_id, v_prev_version;
      RETURN;
    END IF;
  END IF;

  -- ── 5. 정산 상태·인보이스 방어 (멱등 반환 이후에만 적용) ──
  IF v_order.cost_settlement_status = 'SETTLED' THEN
    RAISE EXCEPTION 'already_settled';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.zen_invoices i
    WHERE i.status = 'PAID'
      AND i.metadata->>'source_order_id' = p_order_id::text
  ) THEN
    RAISE EXCEPTION 'paid_invoice_exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.zen_invoices i
    WHERE i.status <> 'CANCELED'
      AND i.metadata->>'source_order_id' = p_order_id::text
  ) THEN
    RAISE EXCEPTION 'ups_invoice_exists';
  END IF;

  -- ── 6. run + amounts + charges + SETTLED (한 트랜잭션) ──
  SELECT coalesce(max(r.version), 0) + 1 INTO v_new_version
  FROM public.zen_ups_settlement_runs r WHERE r.order_id = p_order_id;

  INSERT INTO public.zen_ups_settlement_runs
    (order_id, version, charge_weight_kg, settled_at, settled_by)
  VALUES
    (p_order_id, v_new_version, round(p_charge_weight_kg, 2), now(), auth.uid())
  RETURNING id INTO v_run_id;

  INSERT INTO public.zen_ups_settlement_run_amounts
    (run_id, tier, base_freight, fuel_surcharge, surge_fee, other_charges,
     freight_adjustment, settlement_charges_total, line_total)
  SELECT v_run_id, x.tier,
         round(coalesce(x.base_freight,0),2), round(coalesce(x.fuel_surcharge,0),2),
         round(coalesce(x.surge_fee,0),2), round(coalesce(x.other_charges,0),2),
         round(coalesce(x.freight_adjustment,0),2), round(coalesce(x.settlement_charges_total,0),2),
         round(coalesce(x.line_total,0),2)
  FROM jsonb_to_recordset(p_amounts) AS x(
    tier text, base_freight numeric, fuel_surcharge numeric, surge_fee numeric,
    other_charges numeric, freight_adjustment numeric, settlement_charges_total numeric, line_total numeric)
  WHERE x.tier IN ('ADMIN_TO_AGENCY','SHIPPER');

  INSERT INTO public.zen_ups_settlement_run_charges (run_id, tier, line_no, name, amount)
  SELECT v_run_id, c.tier, c.line_no, btrim(c.name), round(coalesce(c.amount,0),2)
  FROM jsonb_to_recordset(p_charges) AS c(tier text, line_no integer, name text, amount numeric)
  WHERE c.tier IN ('ADMIN_TO_AGENCY','SHIPPER');

  UPDATE public.zen_orders o
  SET cost_settlement_status = 'SETTLED',
      cost_settled_at = now(),
      cost_settled_by = auth.uid()
  WHERE o.id = p_order_id
    AND o.cost_settlement_status IS DISTINCT FROM 'SETTLED';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_settled';
  END IF;

  RETURN QUERY SELECT v_run_id, v_new_version;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_ups_settlement_run(uuid, numeric, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_ups_settlement_run(uuid, numeric, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.finalize_ups_settlement_run(uuid, numeric, jsonb, jsonb) IS
  'TASK-B-381 M3: UPS 정산마감 단일 RPC. run+amounts+charges+SETTLED 원자 처리, admin 3역할 전용, 같은 입력 멱등(새 version 없음), 비취소 인보이스/PAID 차단.';

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (주석 해제 후 실행 — 앱 RPC 호출 제거를 먼저 배포할 것)
-- ============================================================================
-- REVOKE ALL ON FUNCTION public.finalize_ups_settlement_run(uuid, numeric, jsonb, jsonb) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.finalize_ups_settlement_run(uuid, numeric, jsonb, jsonb);
-- NOTIFY pgrst, 'reload schema';
-- ============================================================================
