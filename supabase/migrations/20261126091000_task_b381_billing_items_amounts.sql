-- ============================================================================
-- TASK-B-381 (Issue #1459) M2 — billing_items_amounts run 전용 + statement items 컬럼 + 통화 가드 제거
-- 설계: task file §2-2·§2-3·§2-12 (M2)
-- 적용 순서: M1 → M2 → M3 (앱 배포 전). M2는 함수 교체(동작 변경) — run 없는 오더는 settlement_run_missing으로 차단
-- 되돌리기: 아래 ROLLBACK 블록(컬럼 DROP + b360 원본 두 함수 재적용)
-- ============================================================================

BEGIN;

-- 1) 청구서 항목에 run 조정·항목 상세 컬럼 추가
ALTER TABLE public.zen_billing_statement_items
  ADD COLUMN IF NOT EXISTS freight_adjustment numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS charge_details jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.zen_billing_statement_items.freight_adjustment IS
  'TASK-B-381 M2: target - (base+fuel+surge+other) 운임 조정(run). 음수 가능.';
COMMENT ON COLUMN public.zen_billing_statement_items.charge_details IS
  'TASK-B-381 M2: run 부가운임 항목 상세([{line_no,name,amount,currency}]).';

-- 2) billing_items_amounts — run 전용(레거시 폴백 제거)
-- 반환 타입이 바뀌므로 기존 함수를 먼저 제거한다(생성 RPC는 함수명으로 호출 — 하드 의존 없음).
DROP FUNCTION IF EXISTS public.billing_items_amounts(uuid[], text);

CREATE OR REPLACE FUNCTION public.billing_items_amounts(p_order_ids uuid[], p_tier text)
RETURNS TABLE (
  order_id uuid,
  charge_weight_kg numeric,
  base_freight numeric,
  fuel_surcharge numeric,
  surge_fee numeric,
  other_charges numeric,
  freight_adjustment numeric,
  settlement_charges_total numeric,
  line_total numeric,
  charge_details jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_run_tier text;
  v_missing  integer;
  v_incomplete integer;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  v_run_tier := CASE WHEN p_tier = 'ADMIN_TO_AGENCY' THEN 'ADMIN_TO_AGENCY' ELSE 'SHIPPER' END;

  -- run이 없는 오더는 청구 불가(레거시 폴백 없음)
  SELECT count(*) INTO v_missing
  FROM unnest(p_order_ids) AS x(order_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.zen_ups_settlement_runs r WHERE r.order_id = x.order_id
  );
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'settlement_run_missing';
  END IF;

  -- tier 금액 행이 없는 run은 불완전
  SELECT count(*) INTO v_incomplete
  FROM (
    SELECT DISTINCT ON (r.order_id) r.id
    FROM public.zen_ups_settlement_runs r
    WHERE r.order_id = ANY(p_order_ids)
    ORDER BY r.order_id, r.version DESC
  ) l
  WHERE NOT EXISTS (
    SELECT 1 FROM public.zen_ups_settlement_run_amounts a
    WHERE a.run_id = l.id AND a.tier = v_run_tier
  );
  IF v_incomplete > 0 THEN
    RAISE EXCEPTION 'settlement_run_incomplete';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (r.order_id) r.id, r.order_id, r.charge_weight_kg
    FROM public.zen_ups_settlement_runs r
    WHERE r.order_id = ANY(p_order_ids)
    ORDER BY r.order_id, r.version DESC
  )
  SELECT l.order_id,
         round(l.charge_weight_kg, 2),
         a.base_freight,
         a.fuel_surcharge,
         a.surge_fee,
         a.other_charges,
         a.freight_adjustment,
         a.settlement_charges_total,
         a.line_total,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'line_no', c.line_no, 'name', c.name,
                    'amount', c.amount, 'currency', c.currency
                  ) ORDER BY c.line_no)
           FROM public.zen_ups_settlement_run_charges c
           WHERE c.run_id = l.id AND c.tier = v_run_tier
         ), '[]'::jsonb)
  FROM latest l
  JOIN public.zen_ups_settlement_run_amounts a
    ON a.run_id = l.id AND a.tier = v_run_tier
  ORDER BY l.order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_items_amounts(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.billing_items_amounts(uuid[], text) TO authenticated, service_role;

COMMENT ON FUNCTION public.billing_items_amounts(uuid[], text) IS
  'TASK-B-381 M2: 청구 항목 금액의 단일 원천 — 최신 run만 사용(레거시 폴백 제거). run 없으면 settlement_run_missing.';

-- 3) 통합 청구서 생성 RPC — 통화 가드 제거 + 신규 컬럼 반영
CREATE OR REPLACE FUNCTION public.create_billing_statement_with_items(
  p_billed_org_id   uuid,
  p_billed_name     text,
  p_billed_biz_no   text,
  p_year            integer,
  p_month           integer,
  p_period_from     date,
  p_period_to       date,
  p_order_ids       uuid[]
)
RETURNS TABLE (stmt_id uuid, stmt_no text, stmt_round integer, item_count integer, zero_amount_count integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_issuer      uuid;
  v_issuer_type text;
  v_role        text;
  v_tier        text;
  v_target_type text;
  v_h_id        uuid;
  v_h_no        text;
  v_h_round     integer;
  v_cnt         integer;
  v_zero        integer;
BEGIN
  -- ── 1. 발행자: auth.uid()에서만 도출 (조건 2: issuer_org_id = 내 org) ──
  SELECT p.org_id, o.type, p.role INTO v_issuer, v_issuer_type, v_role
  FROM public.zen_profiles p
  JOIN public.zen_organizations o ON o.id = p.org_id
  WHERE p.id = auth.uid();
  IF v_issuer IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;
  IF v_role NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'AGENCY') THEN
    RAISE EXCEPTION 'create_not_allowed: role=%', v_role;
  END IF;

  -- ── 2. 대상 검증 + tier 도출 (조건 3: 서버가 도출, 클라이언트 미전달) ──
  IF p_billed_org_id IS NOT NULL THEN
    SELECT type INTO v_target_type FROM public.zen_organizations WHERE id = p_billed_org_id;
    IF v_target_type IS NULL THEN
      RAISE EXCEPTION 'target_org_not_found';
    END IF;
    IF v_issuer_type = 'AGENCY' THEN
      IF v_target_type = 'AGENCY' THEN
        RAISE EXCEPTION 'target_not_allowed';   -- 대리점은 대리점을 청구할 수 없음
      END IF;
      v_tier := 'AGENCY_TO_SHIPPER';
    ELSIF v_target_type = 'AGENCY' THEN
      v_tier := 'ADMIN_TO_AGENCY';
    ELSE
      v_tier := 'ADMIN_TO_SHIPPER';
    END IF;
  ELSE
    -- ADHOC 수기 화주 (조건 6: 대리점 발행자만)
    IF v_issuer_type <> 'AGENCY' THEN
      RAISE EXCEPTION 'adhoc_requires_agency_issuer';
    END IF;
    IF p_billed_name IS NULL OR btrim(p_billed_name) = '' THEN
      RAISE EXCEPTION 'adhoc_name_required';
    END IF;
    v_tier := 'AGENCY_TO_SHIPPER';
  END IF;

  -- ── 3. order_ids 검증 ──
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'order_ids_required';
  END IF;
  IF (SELECT count(*) FROM public.zen_orders WHERE id = ANY(p_order_ids))
       <> array_length(p_order_ids, 1) THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- ── 4. 오더 자격 검증 (전원 충족 — 하나라도 실패 시 이 함수 전체 롤백, orphan 헤더 0) ──
  IF EXISTS (
    SELECT 1 FROM public.zen_orders o
    WHERE o.id = ANY(p_order_ids)
      AND (o.transport_mode <> 'UPS' OR o.status <> 'DELIVERED'
           OR o.cost_settlement_status IS DISTINCT FROM 'SETTLED')
  ) THEN
    RAISE EXCEPTION 'order_not_eligible';
  END IF;

  IF p_billed_org_id IS NULL THEN
    -- ADHOC: shipper_id = 발행 대리점 (An_17 §3-2)
    IF EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = ANY(p_order_ids) AND o.shipper_id IS DISTINCT FROM v_issuer
    ) THEN
      RAISE EXCEPTION 'order_not_eligible';
    END IF;
  ELSIF v_tier = 'ADMIN_TO_AGENCY' THEN
    -- Admin → 대리점: agency_org_id = 청구 대상 대리점
    IF EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = ANY(p_order_ids) AND o.agency_org_id IS DISTINCT FROM p_billed_org_id
    ) THEN
      RAISE EXCEPTION 'order_not_eligible';
    END IF;
  ELSIF v_issuer_type = 'AGENCY' THEN
    -- 대리점 → 등록 화주: shipper_id = 대상 화주 AND (items_guard와 동일한 소속 요건)
    IF EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = ANY(p_order_ids)
        AND (o.shipper_id IS DISTINCT FROM p_billed_org_id
             OR o.agency_org_id IS DISTINCT FROM v_issuer)
    ) THEN
      RAISE EXCEPTION 'order_not_eligible';
    END IF;
  ELSE
    -- Admin → 화주: shipper_id = 대상 화주 (비대리점 발행자는 items_guard가 소속 요건 생략)
    IF EXISTS (
      SELECT 1 FROM public.zen_orders o
      WHERE o.id = ANY(p_order_ids) AND o.shipper_id IS DISTINCT FROM p_billed_org_id
    ) THEN
      RAISE EXCEPTION 'order_not_eligible';
    END IF;
  END IF;

  -- 이미 같은 tier 청구서에 담긴 오더 (UNIQUE(order_id,tier) 선차단 — 명확한 오류)
  IF EXISTS (
    SELECT 1 FROM public.zen_billing_statement_items i
    WHERE i.order_id = ANY(p_order_ids) AND i.tier = v_tier
  ) THEN
    RAISE EXCEPTION 'order_already_inclusive';
  END IF;

  -- ── 5. 헤더 생성 (기존 RPC 재사용 — 차수 채번·advisory lock·party/tier 검증 포함) ──
  SELECT h.stmt_id, h.stmt_no, h.stmt_round
    INTO v_h_id, v_h_no, v_h_round
  FROM public.create_billing_statement(
    v_tier, p_year, p_month, p_billed_org_id, p_billed_name,
    p_billed_biz_no, p_period_from, p_period_to
  ) h;

  -- ── 6. 금액 스냅샷 항목 INSERT (billing_items_amounts 단일 원천 사용) ──
  INSERT INTO public.zen_billing_statement_items (
    statement_id, order_id, tier,
    charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges,
    freight_adjustment, charge_details, line_total
  )
  SELECT v_h_id, a.order_id, v_tier,
         a.charge_weight_kg, a.base_freight, a.fuel_surcharge,
         a.surge_fee, a.other_charges,
         a.freight_adjustment, a.charge_details, a.line_total
  FROM public.billing_items_amounts(p_order_ids, v_tier) a;

  -- ── 7. 헤더 합계 갱신 (DRAFT 상태 — 트리거의 발행 후 불변 검사 대상 아님) ──
  UPDATE public.zen_billing_statements s
  SET total_amount = COALESCE(
        (SELECT sum(i.line_total) FROM public.zen_billing_statement_items i
         WHERE i.statement_id = v_h_id), 0)
  WHERE s.id = v_h_id;

  -- ── 8. 결과 집계 (0 금액 건수는 서버 액션이 logger.warn에 사용 — 조건 4b) ──
  SELECT count(*), count(*) FILTER (WHERE i.line_total = 0)
    INTO v_cnt, v_zero
  FROM public.zen_billing_statement_items i
  WHERE i.statement_id = v_h_id;

  RETURN QUERY SELECT v_h_id, v_h_no, v_h_round, v_cnt, v_zero;
END;
$$;

REVOKE ALL ON FUNCTION public.create_billing_statement_with_items(uuid, text, text, integer, integer, date, date, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_billing_statement_with_items(uuid, text, text, integer, integer, date, date, uuid[]) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (주석 해제 후 실행 — 앱 RPC 호출 제거를 먼저 배포할 것)
--   순서: billing_items_amounts DROP → b360 두 함수 재적용 → 컬럼 DROP → reload
-- ============================================================================
-- BEGIN;
--
-- DROP FUNCTION IF EXISTS public.billing_items_amounts(uuid[], text);
--
-- CREATE OR REPLACE FUNCTION public.create_billing_statement_with_items(
--   p_billed_org_id   uuid,
--   p_billed_name     text,
--   p_billed_biz_no   text,
--   p_year            integer,
--   p_month           integer,
--   p_period_from     date,
--   p_period_to       date,
--   p_order_ids       uuid[]
-- )
-- RETURNS TABLE (stmt_id uuid, stmt_no text, stmt_round integer, item_count integer, zero_amount_count integer)
-- LANGUAGE plpgsql
-- SECURITY INVOKER
-- SET search_path = public
-- AS $$
-- DECLARE
--   v_issuer      uuid;
--   v_issuer_type text;
--   v_role        text;
--   v_tier        text;
--   v_target_type text;
--   v_h_id        uuid;
--   v_h_no        text;
--   v_h_round     integer;
--   v_cnt         integer;
--   v_zero        integer;
-- BEGIN
--   -- ── 1. 발행자: auth.uid()에서만 도출 (조건 2: issuer_org_id = 내 org) ──
--   SELECT p.org_id, o.type, p.role INTO v_issuer, v_issuer_type, v_role
--   FROM public.zen_profiles p
--   JOIN public.zen_organizations o ON o.id = p.org_id
--   WHERE p.id = auth.uid();
--   IF v_issuer IS NULL THEN
--     RAISE EXCEPTION 'profile_not_found';
--   END IF;
--   IF v_role NOT IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'AGENCY') THEN
--     RAISE EXCEPTION 'create_not_allowed: role=%', v_role;
--   END IF;
--
--   -- ── 2. 대상 검증 + tier 도출 (조건 3: 서버가 도출, 클라이언트 미전달) ──
--   IF p_billed_org_id IS NOT NULL THEN
--     SELECT type INTO v_target_type FROM public.zen_organizations WHERE id = p_billed_org_id;
--     IF v_target_type IS NULL THEN
--       RAISE EXCEPTION 'target_org_not_found';
--     END IF;
--     IF v_issuer_type = 'AGENCY' THEN
--       IF v_target_type = 'AGENCY' THEN
--         RAISE EXCEPTION 'target_not_allowed';   -- 대리점은 대리점을 청구할 수 없음
--       END IF;
--       v_tier := 'AGENCY_TO_SHIPPER';
--     ELSIF v_target_type = 'AGENCY' THEN
--       v_tier := 'ADMIN_TO_AGENCY';
--     ELSE
--       v_tier := 'ADMIN_TO_SHIPPER';
--     END IF;
--   ELSE
--     -- ADHOC 수기 화주 (조건 6: 대리점 발행자만)
--     IF v_issuer_type <> 'AGENCY' THEN
--       RAISE EXCEPTION 'adhoc_requires_agency_issuer';
--     END IF;
--     IF p_billed_name IS NULL OR btrim(p_billed_name) = '' THEN
--       RAISE EXCEPTION 'adhoc_name_required';
--     END IF;
--     v_tier := 'AGENCY_TO_SHIPPER';
--   END IF;
--
--   -- ── 3. order_ids 검증 ──
--   IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
--     RAISE EXCEPTION 'order_ids_required';
--   END IF;
--   IF (SELECT count(*) FROM public.zen_orders WHERE id = ANY(p_order_ids))
--        <> array_length(p_order_ids, 1) THEN
--     RAISE EXCEPTION 'order_not_found';
--   END IF;
--
--   -- ── 4. 오더 자격 검증 (전원 충족 — 하나라도 실패 시 이 함수 전체 롤백, orphan 헤더 0) ──
--   IF EXISTS (
--     SELECT 1 FROM public.zen_orders o
--     WHERE o.id = ANY(p_order_ids)
--       AND (o.transport_mode <> 'UPS' OR o.status <> 'DELIVERED'
--            OR o.cost_settlement_status IS DISTINCT FROM 'SETTLED')
--   ) THEN
--     RAISE EXCEPTION 'order_not_eligible';
--   END IF;
--
--   IF p_billed_org_id IS NULL THEN
--     -- ADHOC: shipper_id = 발행 대리점 (An_17 §3-2)
--     IF EXISTS (
--       SELECT 1 FROM public.zen_orders o
--       WHERE o.id = ANY(p_order_ids) AND o.shipper_id IS DISTINCT FROM v_issuer
--     ) THEN
--       RAISE EXCEPTION 'order_not_eligible';
--     END IF;
--   ELSIF v_tier = 'ADMIN_TO_AGENCY' THEN
--     -- Admin → 대리점: agency_org_id = 청구 대상 대리점
--     IF EXISTS (
--       SELECT 1 FROM public.zen_orders o
--       WHERE o.id = ANY(p_order_ids) AND o.agency_org_id IS DISTINCT FROM p_billed_org_id
--     ) THEN
--       RAISE EXCEPTION 'order_not_eligible';
--     END IF;
--   ELSIF v_issuer_type = 'AGENCY' THEN
--     -- 대리점 → 등록 화주: shipper_id = 대상 화주 AND (items_guard와 동일한 소속 요건)
--     IF EXISTS (
--       SELECT 1 FROM public.zen_orders o
--       WHERE o.id = ANY(p_order_ids)
--         AND (o.shipper_id IS DISTINCT FROM p_billed_org_id
--              OR o.agency_org_id IS DISTINCT FROM v_issuer)
--     ) THEN
--       RAISE EXCEPTION 'order_not_eligible';
--     END IF;
--   ELSE
--     -- Admin → 화주: shipper_id = 대상 화주 (비대리점 발행자는 items_guard가 소속 요건 생략)
--     IF EXISTS (
--       SELECT 1 FROM public.zen_orders o
--       WHERE o.id = ANY(p_order_ids) AND o.shipper_id IS DISTINCT FROM p_billed_org_id
--     ) THEN
--       RAISE EXCEPTION 'order_not_eligible';
--     END IF;
--   END IF;
--
--   -- 이미 같은 tier 청구서에 담긴 오더 (UNIQUE(order_id,tier) 선차단 — 명확한 오류)
--   IF EXISTS (
--     SELECT 1 FROM public.zen_billing_statement_items i
--     WHERE i.order_id = ANY(p_order_ids) AND i.tier = v_tier
--   ) THEN
--     RAISE EXCEPTION 'order_already_inclusive';
--   END IF;
--
--   -- ── 5. 헤더 생성 (기존 RPC 재사용 — 차수 채번·advisory lock·party/tier 검증 포함) ──
--   SELECT h.stmt_id, h.stmt_no, h.stmt_round
--     INTO v_h_id, v_h_no, v_h_round
--   FROM public.create_billing_statement(
--     v_tier, p_year, p_month, p_billed_org_id, p_billed_name,
--     p_billed_biz_no, p_period_from, p_period_to
--   ) h;
--
--   -- ── 6. 통화 가드: 헤더는 KRW 고정이라 비 KRW 매출 행의 무전환 합산은 금액 오염 ──
--   IF v_tier <> 'ADMIN_TO_AGENCY' AND EXISTS (
--     SELECT 1 FROM public.zen_order_costs c
--     WHERE c.order_id = ANY(p_order_ids)
--       AND c.is_revenue = true
--       AND c.currency IS DISTINCT FROM 'KRW'
--   ) THEN
--     RAISE EXCEPTION 'unsupported_cost_currency';
--   END IF;
--
--   -- ── 7. 금액 스냅샷 항목 INSERT (billing_items_amounts 단일 원천 사용) ──
--   INSERT INTO public.zen_billing_statement_items (
--     statement_id, order_id, tier,
--     charge_weight_kg, base_freight, fuel_surcharge, surge_fee, other_charges, line_total
--   )
--   SELECT v_h_id, a.order_id, v_tier,
--          a.charge_weight_kg, a.base_freight, a.fuel_surcharge,
--          a.surge_fee, a.other_charges, a.line_total
--   FROM public.billing_items_amounts(p_order_ids, v_tier) a;
--
--   -- ── 8. 헤더 합계 갱신 (DRAFT 상태 — 트리거의 발행 후 불변 검사 대상 아님) ──
--   UPDATE public.zen_billing_statements s
--   SET total_amount = COALESCE(
--         (SELECT sum(i.line_total) FROM public.zen_billing_statement_items i
--          WHERE i.statement_id = v_h_id), 0)
--   WHERE s.id = v_h_id;
--
--   -- ── 9. 결과 집계 (0 금액 건수는 서버 액션이 logger.warn에 사용 — 조건 4b) ──
--   SELECT count(*), count(*) FILTER (WHERE i.line_total = 0)
--     INTO v_cnt, v_zero
--   FROM public.zen_billing_statement_items i
--   WHERE i.statement_id = v_h_id;
--
--   RETURN QUERY SELECT v_h_id, v_h_no, v_h_round, v_cnt, v_zero;
-- END;
-- $$;

--
-- ALTER TABLE public.zen_billing_statement_items
--   DROP COLUMN IF EXISTS freight_adjustment,
--   DROP COLUMN IF EXISTS charge_details;
--
-- CREATE OR REPLACE FUNCTION public.billing_items_amounts(p_order_ids uuid[], p_tier text)
-- RETURNS TABLE (
--   order_id         uuid,
--   charge_weight_kg numeric,
--   base_freight     numeric,
--   fuel_surcharge   numeric,
--   surge_fee        numeric,
--   other_charges    numeric,
--   line_total       numeric
-- )
-- LANGUAGE plpgsql
-- STABLE
-- SECURITY INVOKER
-- SET search_path = public
-- AS $$
-- BEGIN
--   IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
--     RETURN;
--   END IF;
--
--   RETURN QUERY
--   SELECT x.order_id,
--          round(x.w, 2), round(x.b, 2), round(x.f, 2), round(x.s, 2), round(x.o, 2),
--          round(x.b, 2) + round(x.f, 2) + round(x.s, 2) + round(x.o, 2)
--   FROM (
--     SELECT
--       o.id AS order_id,
--       -- 청구중량: billingWeightKg → chargeableWeightKg → UPS 실측중량 (실측: actual_weight_kg는 대부분 NULL)
--       COALESCE(
--         (rs.metadata -> 'platform' ->> 'billingWeightKg')::numeric,
--         (rs.metadata -> 'platform' ->> 'chargeableWeightKg')::numeric,
--         u.actual_weight_kg, 0
--       ) AS w,
--       CASE WHEN p_tier = 'ADMIN_TO_AGENCY'
--         THEN COALESCE((rs.metadata -> 'agency'   ->> 'baseSellingPrice')::numeric,
--                       (rs.metadata -> 'platform' ->> 'baseSellingPrice')::numeric, 0)
--         ELSE COALESCE(c.base_freight, 0) END AS b,
--       CASE WHEN p_tier = 'ADMIN_TO_AGENCY'
--         THEN COALESCE((rs.metadata -> 'agency'   ->> 'fuelSurchargeSellingAmount')::numeric,
--                       (rs.metadata -> 'platform' ->> 'fuelSurchargeSellingAmount')::numeric, 0)
--         ELSE COALESCE(c.fuel_surcharge, 0) END AS f,
--       CASE WHEN p_tier = 'ADMIN_TO_AGENCY'
--         THEN COALESCE((rs.metadata -> 'agency'   ->> 'surgeFeeSellingAmount')::numeric,
--                       (rs.metadata -> 'platform' ->> 'surgeFeeSellingAmount')::numeric, 0)
--         ELSE COALESCE(c.surge_fee, 0) END AS s,
--       CASE WHEN p_tier = 'ADMIN_TO_AGENCY'
--         THEN COALESCE((rs.metadata -> 'agency'   ->> 'otherChargesSellingTotal')::numeric,
--                       (rs.metadata -> 'platform' ->> 'otherChargesSellingTotal')::numeric, 0)
--         ELSE COALESCE(c.line_total, 0) - COALESCE(c.base_freight, 0)
--                                        - COALESCE(c.fuel_surcharge, 0)
--                                        - COALESCE(c.surge_fee, 0) END AS o
--     FROM public.zen_orders o
--     LEFT JOIN public.zen_order_rate_snapshots rs ON rs.order_id = o.id
--     LEFT JOIN public.zen_ups_actual_cost u ON u.order_id = o.id
--     LEFT JOIN (
--       SELECT k.order_id,
--              sum(k.total_amount) FILTER (WHERE k.cost_type = 'BASE_FREIGHT')   AS base_freight,
--              sum(k.total_amount) FILTER (WHERE k.cost_type = 'FUEL_SURCHARGE') AS fuel_surcharge,
--              sum(k.total_amount) FILTER (WHERE k.cost_type = 'SURGE_FEE')      AS surge_fee,
--              sum(k.total_amount) AS line_total   -- is_revenue=true 전체 (미지정 유형 포함 — 금액 누락 0)
--       FROM public.zen_order_costs k
--       WHERE k.is_revenue = true AND k.order_id = ANY(p_order_ids)
--       GROUP BY k.order_id
--     ) c ON c.order_id = o.id
--     WHERE o.id = ANY(p_order_ids)
--   ) x;
-- END;
-- $$;

--
-- REVOKE ALL ON FUNCTION public.billing_items_amounts(uuid[], text) FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.billing_items_amounts(uuid[], text) TO authenticated, service_role;
-- REVOKE ALL ON FUNCTION public.create_billing_statement_with_items(uuid, text, text, integer, integer, date, date, uuid[]) FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.create_billing_statement_with_items(uuid, text, text, integer, integer, date, date, uuid[]) TO authenticated, service_role;
--
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
-- ============================================================================
