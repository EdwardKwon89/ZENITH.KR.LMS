-- TASK-B-359 (Issue #1365): 청구서 DB — 헤더·항목 테이블·채번 RPC·RLS·상태 전이 트리거
-- 설계: docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md §3-2·§3-4 (PR #1391)
--       + Jaison [설계 확정] 코멘트 2026-11-19 (구현 조건 6건 포함 — 이슈 #1365)
-- 범위: 마이그레이션 + 채번 RPC + RLS + 상태 전이 트리거 (서버 액션은 Task 3)
-- 서버 액션은 user-session client(validateUserAction)로만 RPC를 호출할 것(service_role은 RLS 우회).

BEGIN;

-- ============================================================
-- 1. 월 차수 카운터 (조건 1 — RLS 활성 + 정책 없음)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zen_billing_statement_seq (
  period_year  integer NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  last_seq     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (period_year, period_month)
);

COMMENT ON TABLE public.zen_billing_statement_seq IS
  'TASK-B-359: 월 내 청구서 번호 seq 카운터 (S-1, 취소 시 번호 gap 허용). RLS 활성+정책 없음 — 직접 접근 차단, 증분은 next_billing_statement_seq만';

ALTER TABLE public.zen_billing_statement_seq ENABLE ROW LEVEL SECURITY;
-- 정책 의도적 미생성: authenticated의 직접 SELECT/INSERT/UPDATE 차단 (조건 1)
GRANT ALL ON public.zen_billing_statement_seq TO postgres, service_role, authenticated;

-- ============================================================
-- 2. 청구서 헤더
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zen_billing_statements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_no       text NOT NULL UNIQUE
                     CHECK (statement_no ~ '^ST-[0-9]{6}-[0-9]{2}-[0-9]{4}$'),
  issuer_org_id      uuid NOT NULL REFERENCES public.zen_organizations(id),
  billed_party_type  text NOT NULL CHECK (billed_party_type IN ('ORG','ADHOC')),
  billed_org_id      uuid REFERENCES public.zen_organizations(id),
  billed_name        text,
  billed_biz_no      text,
  -- 조건: G-1 GENERATED STORED (정규화를 DB가 강제 — lower/btrim/regexp_replace/uuid::text 실측 IMMUTABLE)
  billed_key         text NOT NULL GENERATED ALWAYS AS (
                       CASE WHEN billed_party_type = 'ORG'
                            THEN 'ORG:' || billed_org_id::text
                            ELSE 'ADHOC:' || lower(btrim(regexp_replace(billed_name, '\s+', ' ', 'g')))
                       END
                     ) STORED,
  tier               text NOT NULL CHECK (tier IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER')),
  period_year        integer NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month       integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  round_no           integer NOT NULL CHECK (round_no >= 1),
  period_from        date,
  period_to          date,
  total_amount       numeric(14,2) NOT NULL DEFAULT 0,
  currency           text NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  status             text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','CLOSED')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES public.zen_profiles(id) ON DELETE SET NULL,
  issued_at          timestamptz,
  issued_by          uuid REFERENCES public.zen_profiles(id) ON DELETE SET NULL,
  paid_amount        numeric(14,2),
  paid_date          date,
  closed_at          timestamptz,
  closed_by          uuid REFERENCES public.zen_profiles(id) ON DELETE SET NULL,

  -- R11 (Jaison 배정 코멘트): ORG면 org 필수 / ADHOC면 org NULL + name 필수
  -- (PR #1397 수정 4: ADHOC 공백 이름 방지 — ' '만으로 billed_key='ADHOC:'가 되는 것 차단)
  CONSTRAINT zen_billing_statements_party_check CHECK (
    (billed_party_type = 'ORG'   AND billed_org_id IS NOT NULL) OR
    (billed_party_type = 'ADHOC' AND billed_org_id IS NULL AND billed_name IS NOT NULL
       AND btrim(billed_name) <> '')
  ),
  -- 조건 3 (Q7 전액만): CLOSED ⇒ paid_amount = total_amount (NULL도 거부)
  CONSTRAINT zen_billing_statements_paid_check CHECK (
    status <> 'CLOSED' OR (paid_amount IS NOT NULL AND paid_amount = total_amount)
  ),
  -- 발행(이후)은 발행 시각 필수 — 상태 머신과 동기화
  CONSTRAINT zen_billing_statements_issued_at_check CHECK (
    status = 'DRAFT' OR issued_at IS NOT NULL
  ),
  -- 차수 유일키 (조건: issuer + billed_key + 년 + 월 + 차수)
  CONSTRAINT zen_billing_statements_round_uq UNIQUE
    (issuer_org_id, billed_key, period_year, period_month, round_no),
  -- 조건 5: 항목 FK가 헤더 tier를 참조하기 위한 유일키
  CONSTRAINT zen_billing_statements_id_tier_uq UNIQUE (id, tier)
);

CREATE INDEX IF NOT EXISTS idx_zen_billing_statements_issuer
  ON public.zen_billing_statements (issuer_org_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_zen_billing_statements_billed
  ON public.zen_billing_statements (billed_org_id, status);

COMMENT ON TABLE public.zen_billing_statements IS '청구서관리(월 차수) 헤더 — DRAFT→ISSUED→CLOSED, 발행 후 취소·삭제 불가(트리거)';
COMMENT ON COLUMN public.zen_billing_statements.statement_no IS 'ST-YYYYMM-NN-SSSS (NN=차수 2자리, SSSS=월 내 전체 seq 4자리 — Jaison 2026-11-19 확정)';
COMMENT ON COLUMN public.zen_billing_statements.billed_key IS '차수 유일키용 정규화 키: ORG:<org_id> / ADHOC:<소문자·공백압축 화주명> (GENERATED STORED)';
COMMENT ON COLUMN public.zen_billing_statements.billed_name IS '청구 대상 표시명 스냅샷 (ADHOC=입력값 필수, ORG=발행 시점 조직명)';
COMMENT ON COLUMN public.zen_billing_statements.billed_biz_no IS '청구 대상 사업자번호 스냅샷 (선택)';

-- ============================================================
-- 3. 청구서 항목 (오더 스냅샷)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zen_billing_statement_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id     uuid NOT NULL REFERENCES public.zen_billing_statements(id) ON DELETE CASCADE,
  order_id         uuid NOT NULL REFERENCES public.zen_orders(id),
  tier             text NOT NULL CHECK (tier IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER')),
  charge_weight_kg numeric(10,2) NOT NULL DEFAULT 0,
  base_freight     numeric(14,2) NOT NULL DEFAULT 0,
  fuel_surcharge   numeric(14,2) NOT NULL DEFAULT 0,
  surge_fee        numeric(14,2) NOT NULL DEFAULT 0,
  other_charges    numeric(14,2) NOT NULL DEFAULT 0,
  line_total       numeric(14,2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- R5-2/Q3: 한 오더는 티어별 1회 (다른 티어 청구서엔 각각 1회 허용)
  CONSTRAINT zen_billing_statement_items_order_uq UNIQUE (order_id, tier),
  -- 조건 5: 항목 tier는 헤더 tier와 일치해야 함 (composite FK)
  CONSTRAINT zen_billing_statement_items_hdr_fk FOREIGN KEY (statement_id, tier)
    REFERENCES public.zen_billing_statements (id, tier) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_zen_billing_statement_items_stmt
  ON public.zen_billing_statement_items (statement_id);

COMMENT ON TABLE public.zen_billing_statement_items IS
  '청구서-오더 스냅샷 항목 (발행 후 오더 값이 바뀌어도 청구서 불변). 헤더 삭제 시 CASCADE → 오더 재청구 가능';

-- ============================================================
-- 4. 채번 RPC (조건 1: 좁은 SECURITY DEFINER 하나만)
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_billing_statement_seq(p_year integer, p_month integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_next integer;
BEGIN
  IF p_year NOT BETWEEN 2000 AND 2100 OR p_month NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'invalid_period: %-%', p_year, p_month;
  END IF;
  -- 단일 문장 원자 증분 (경쟁 시 한쪽이 UPDATE 후킹, 중복 불가)
  INSERT INTO public.zen_billing_statement_seq AS c (period_year, period_month, last_seq)
  VALUES (p_year, p_month, 1)
  ON CONFLICT (period_year, period_month)
  DO UPDATE SET last_seq = c.last_seq + 1
  RETURNING last_seq INTO v_next;
  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.next_billing_statement_seq(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_billing_statement_seq(integer, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.next_billing_statement_seq(integer, integer) IS
  'TASK-B-359 조건1: 월 seq 원자 증분 (유일한 카운터 접근 경로, SECURITY DEFINER)';

-- ============================================================
-- 5. 통합 생성 RPC — 채번 + 헤더 INSERT 원자 (B-1, INVOKER)
--    발행자는 인자 없이 auth.uid()에서 도출 (RLS WITH CHECK가 최종 방어선)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_billing_statement(
  p_tier          text,
  p_period_year   integer,
  p_period_month  integer,
  p_billed_org_id uuid DEFAULT NULL,
  p_billed_name   text DEFAULT NULL,
  p_billed_biz_no text DEFAULT NULL,
  p_period_from   date DEFAULT NULL,
  p_period_to     date DEFAULT NULL
)
RETURNS TABLE (stmt_id uuid, stmt_no text, stmt_round integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_issuer     uuid;
  v_issuer_type text;
  v_role       text;
  v_party      text;
  v_billed_name text;
  v_key        text;
  v_round      integer;
  v_seq        integer;
  v_no         text;
  v_id         uuid;
BEGIN
  -- 발행자: auth.uid()에서 도출 (인자 없음)
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
  IF p_tier NOT IN ('ADMIN_TO_AGENCY','AGENCY_TO_SHIPPER','ADMIN_TO_SHIPPER') THEN
    RAISE EXCEPTION 'invalid_tier: %', p_tier;
  END IF;
  IF p_period_year NOT BETWEEN 2000 AND 2100 OR p_period_month NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'invalid_period: %-%', p_period_year, p_period_month;
  END IF;

  IF p_billed_org_id IS NOT NULL THEN
    -- ORG 대상
    v_party := 'ORG';
    SELECT name INTO v_billed_name FROM public.zen_organizations WHERE id = p_billed_org_id;
    IF v_billed_name IS NULL THEN
      RAISE EXCEPTION 'target_org_not_found';
    END IF;
    -- 방어(An_17 §5-2 "대상 소속 아님"): 대리점 발행자는 자기 연결 화주만
    IF v_issuer_type = 'AGENCY' AND NOT EXISTS (
      SELECT 1 FROM public.zen_agency_shippers s
      WHERE s.agency_org_id = v_issuer AND s.shipper_org_id = p_billed_org_id AND s.is_active
    ) THEN
      RAISE EXCEPTION 'target_not_linked';
    END IF;
    v_key := 'ORG:' || p_billed_org_id::text;
  ELSE
    -- ADHOC 대상 (조건 6: 대리점 발행자만)
    v_party := 'ADHOC';
    IF p_billed_name IS NULL OR btrim(p_billed_name) = '' THEN
      RAISE EXCEPTION 'adhoc_name_required';
    END IF;
    IF v_issuer_type <> 'AGENCY' THEN
      RAISE EXCEPTION 'adhoc_requires_agency_issuer';
    END IF;
    v_billed_name := p_billed_name;
    v_key := 'ADHOC:' || lower(btrim(regexp_replace(p_billed_name, '\s+', ' ', 'g')));
  END IF;

  -- PR #1397 수정 3: 발행자 유형 ↔ tier 정합성 (AGENCY는 AGENCY_TO_SHIPPER만, 비대리점은 ADMIN_*만)
  IF v_issuer_type = 'AGENCY' AND p_tier <> 'AGENCY_TO_SHIPPER' THEN
    RAISE EXCEPTION 'tier_mismatch_for_issuer: agency issuer can only issue AGENCY_TO_SHIPPER (got %)', p_tier;
  END IF;
  IF v_issuer_type <> 'AGENCY' AND p_tier = 'AGENCY_TO_SHIPPER' THEN
    RAISE EXCEPTION 'tier_mismatch_for_issuer: non-agency issuer cannot issue AGENCY_TO_SHIPPER';
  END IF;

  -- 동시성: (issuer, billed_key, 년, 월) 단위 advisory lock 선취 → max(round)+1
  PERFORM pg_advisory_xact_lock(
    hashtext('billing_round'),
    hashtext(v_issuer::text || ':' || v_key || ':' || p_period_year || ':' || p_period_month)
  );
  SELECT COALESCE(MAX(round_no), 0) + 1 INTO v_round
  FROM public.zen_billing_statements
  WHERE issuer_org_id = v_issuer
    AND billed_key = v_key
    AND period_year = p_period_year
    AND period_month = p_period_month;

  v_seq := public.next_billing_statement_seq(p_period_year, p_period_month);
  v_no := 'ST-' || to_char(make_date(p_period_year, p_period_month, 1), 'YYYYMM')
               || '-' || lpad(v_round::text, 2, '0')
               || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.zen_billing_statements (
    statement_no, issuer_org_id, billed_party_type, billed_org_id,
    billed_name, billed_biz_no, tier, period_year, period_month, round_no,
    period_from, period_to, created_by
  ) VALUES (
    v_no, v_issuer, v_party, p_billed_org_id,
    v_billed_name, p_billed_biz_no, p_tier, p_period_year, p_period_month, v_round,
    p_period_from, p_period_to, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_no, v_round;
END;
$$;

REVOKE ALL ON FUNCTION public.create_billing_statement(text, integer, integer, uuid, text, text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_billing_statement(text, integer, integer, uuid, text, text, date, date) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_billing_statement(text, integer, integer, uuid, text, text, date, date) IS
  'TASK-B-359 B-1: 채번(advisory lock+max round)+seq+헤더 INSERT 원자 RPC (DRAFT, 항목 0건). 발행자는 auth.uid() 도출, INVOKER=RLS 최종 방어';

-- ============================================================
-- 6. 상태 전이·불변 트리거 (조건 2·3·4 — D-1 3층 방어의 트리거 층)
-- ============================================================
CREATE OR REPLACE FUNCTION public.billing_statement_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 전이 화이트리스트: DRAFT→ISSUED, ISSUED→CLOSED 만 (DRAFT→CLOSED 직행 거부)
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT ((OLD.status = 'DRAFT'  AND NEW.status = 'ISSUED') OR
            (OLD.status = 'ISSUED' AND NEW.status = 'CLOSED')) THEN
      RAISE EXCEPTION 'invalid_status_transition: % -> %', OLD.status, NEW.status;
    END IF;
    -- 발행 = 항목 최소 1건 (An_17 §5-2 issueBillingStatement "항목 0건" 오류의 DB 층)
    IF NEW.status = 'ISSUED' AND NOT EXISTS (
      SELECT 1 FROM public.zen_billing_statement_items WHERE statement_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'issue_without_items';
    END IF;
  END IF;

  -- 조건 2: 발행 이후(OLD.status <> DRAFT) 핵심 컬럼 불변 — ISSUED→ISSUE로 금액 변형 우회 차단
  IF OLD.status <> 'DRAFT' THEN
    IF NEW.issuer_org_id IS DISTINCT FROM OLD.issuer_org_id
      OR NEW.statement_no IS DISTINCT FROM OLD.statement_no
      OR NEW.billed_party_type IS DISTINCT FROM OLD.billed_party_type
      OR NEW.billed_org_id IS DISTINCT FROM OLD.billed_org_id
      OR NEW.billed_name IS DISTINCT FROM OLD.billed_name
      OR NEW.billed_biz_no IS DISTINCT FROM OLD.billed_biz_no
      -- NOTE: billed_key(GENERATED)는 BEFORE 트리거 시점의 NEW에 반영되지 않아(계산이 트리거 후)
      --       항상 NULL → 비교 무의미. UPDATE 자체가 "column is a generated column"으로 거부되므로 별도 보호 불필요.
      OR NEW.tier IS DISTINCT FROM OLD.tier
      OR NEW.period_year IS DISTINCT FROM OLD.period_year
      OR NEW.period_month IS DISTINCT FROM OLD.period_month
      OR NEW.period_from IS DISTINCT FROM OLD.period_from
      OR NEW.period_to IS DISTINCT FROM OLD.period_to
      OR NEW.round_no IS DISTINCT FROM OLD.round_no
      OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
      OR NEW.currency IS DISTINCT FROM OLD.currency
    THEN
      RAISE EXCEPTION 'issued_header_immutable';
    END IF;
  END IF;

  -- 생성 정보는 항상 불변
  IF NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_fields_immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_statement_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 취소(삭제)는 DRAFT 한정 (R7) — ISSUED/CLOSED 헤더 삭제 거부
  IF OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'header_delete_forbidden: status=%', OLD.status;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.billing_statement_items_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_issuer uuid;
  v_issuer_type text;
  v_header uuid;
  v_order_order uuid;
  v_order_shipper uuid;
  v_order_agency uuid;
  v_order_settled text;
BEGIN
  v_header := CASE WHEN TG_OP = 'DELETE' THEN OLD.statement_id ELSE NEW.statement_id END;

  SELECT status, issuer_org_id INTO v_status, v_issuer FROM public.zen_billing_statements WHERE id = v_header;

  IF NOT FOUND THEN
    -- 조건 4: 헤더 CASCADE 삭제 중(헤더가 이미 없음) — 항목 DELETE 허용
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'header_not_found';
  END IF;
  -- 발행 이후 항목 INSERT/UPDATE/DELETE 전면 거부
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'items_locked_after_issue: status=%', v_status;
  END IF;

  -- PR #1397 수정 2: 오더 적합성 (INSERT + order_id 변경 UPDATE만 — RLS 최종 방어선)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.order_id IS DISTINCT FROM OLD.order_id) THEN
    SELECT o.shipper_id, o.agency_org_id, o.cost_settlement_status
      INTO v_order_shipper, v_order_agency, v_order_settled
    FROM public.zen_orders o WHERE o.id = NEW.order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_order_not_eligible: order not found';
    END IF;
    -- ① 정산완료(SETTLED) 오더만 청구서 포함 가능
    IF v_order_settled IS DISTINCT FROM 'SETTLED' THEN
      RAISE EXCEPTION 'item_order_not_eligible: cost not settled (status=%)', coalesce(v_order_settled, 'NULL');
    END IF;
    -- ② 발행자가 대리점이면 자기 소속 오더만 (Admin/비대리점 발행자는 전체 허용)
    SELECT type INTO v_issuer_type FROM public.zen_organizations WHERE id = v_issuer;
    IF v_issuer_type = 'AGENCY' AND v_order_shipper IS DISTINCT FROM v_issuer
       AND v_order_agency IS DISTINCT FROM v_issuer THEN
      RAISE EXCEPTION 'item_order_not_eligible: order not owned by issuer org';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_statement_before_update ON public.zen_billing_statements;
CREATE TRIGGER trg_billing_statement_before_update
  BEFORE UPDATE ON public.zen_billing_statements
  FOR EACH ROW EXECUTE FUNCTION public.billing_statement_before_update();

DROP TRIGGER IF EXISTS trg_billing_statement_before_delete ON public.zen_billing_statements;
CREATE TRIGGER trg_billing_statement_before_delete
  BEFORE DELETE ON public.zen_billing_statements
  FOR EACH ROW EXECUTE FUNCTION public.billing_statement_before_delete();

DROP TRIGGER IF EXISTS trg_billing_statement_items_guard ON public.zen_billing_statement_items;
CREATE TRIGGER trg_billing_statement_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.zen_billing_statement_items
  FOR EACH ROW EXECUTE FUNCTION public.billing_statement_items_guard();

-- ============================================================
-- 7. RLS — 헤더 SELECT 3경로 + 쓰기=발행자 (An_17 §3-4, Jaison 확정)
-- ============================================================
ALTER TABLE public.zen_billing_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_billing_statement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bill_stmt_select_issuer ON public.zen_billing_statements;
CREATE POLICY bill_stmt_select_issuer ON public.zen_billing_statements
  FOR SELECT TO authenticated
  USING (
    issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS bill_stmt_select_billed ON public.zen_billing_statements;
CREATE POLICY bill_stmt_select_billed ON public.zen_billing_statements
  FOR SELECT TO authenticated
  USING (
    billed_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    AND status IN ('ISSUED', 'CLOSED')   -- 경로 ②: DRAFT 비노출, 발행 후 조회만
  );

DROP POLICY IF EXISTS bill_stmt_select_supervise ON public.zen_billing_statements;
CREATE POLICY bill_stmt_select_supervise ON public.zen_billing_statements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'ZENITH_SUPER_ADMIN')   -- MANAGER 제외 (Jaison 확정)
    )
    AND EXISTS (
      SELECT 1 FROM public.zen_organizations o
      WHERE o.id = issuer_org_id AND o.type = 'AGENCY'  -- 대리점 발행분만 감독
    )
  ); -- 전 상태·읽기 전용 (SELECT 정책이므로 UPDATE/DELETE 불가)

DROP POLICY IF EXISTS bill_stmt_insert_issuer ON public.zen_billing_statements;
CREATE POLICY bill_stmt_insert_issuer ON public.zen_billing_statements
  FOR INSERT TO authenticated
  WITH CHECK (
    issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.zen_profiles WHERE id = auth.uid())
        IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'AGENCY')    -- 생성 주체: Admin·대리점만 (권한 매트릭스)
    AND (
      billed_party_type = 'ORG'
      OR EXISTS (SELECT 1 FROM public.zen_organizations o
                 WHERE o.id = issuer_org_id AND o.type = 'AGENCY')  -- 조건 6: ADHOC은 대리점 발행자만
    )
    -- PR #1397 수정 1: 상태 머신 우회 차단 — 직접 INSERT는 DRAFT만 (ISSUED/CLOSED 즉시 생성 불가)
    AND status = 'DRAFT'
    AND issued_at IS NULL AND paid_amount IS NULL AND closed_at IS NULL
    -- PR #1397 수정 3: 발행자 유형 ↔ tier 정합성 (INSERT 경로에서도 강제)
    AND (
      (EXISTS (SELECT 1 FROM public.zen_organizations o
               WHERE o.id = issuer_org_id AND o.type = 'AGENCY') AND tier = 'AGENCY_TO_SHIPPER')
      OR
      (NOT EXISTS (SELECT 1 FROM public.zen_organizations o
                   WHERE o.id = issuer_org_id AND o.type = 'AGENCY')
       AND tier IN ('ADMIN_TO_AGENCY', 'ADMIN_TO_SHIPPER'))
    )
  );

DROP POLICY IF EXISTS bill_stmt_update_issuer ON public.zen_billing_statements;
CREATE POLICY bill_stmt_update_issuer ON public.zen_billing_statements
  FOR UPDATE TO authenticated
  USING (
    issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.zen_profiles WHERE id = auth.uid())
        IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'AGENCY')
  )
  WITH CHECK (
    issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS bill_stmt_delete_issuer ON public.zen_billing_statements;
CREATE POLICY bill_stmt_delete_issuer ON public.zen_billing_statements
  FOR DELETE TO authenticated
  USING (
    issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.zen_profiles WHERE id = auth.uid())
        IN ('ADMIN', 'ZENITH_SUPER_ADMIN', 'AGENCY')
  ); -- DRAFT 한정은 트리거(사유 명확화) — ISSUED DELETE는 트리거가 RAISE

GRANT ALL ON public.zen_billing_statements TO postgres, service_role, authenticated;
GRANT ALL ON public.zen_billing_statement_items TO postgres, service_role, authenticated;

-- ============================================================
-- 8. RLS — 항목: 헤더 종속 (헤더가 보이면 그 안에서, 쓰기는 발행자+DRAFT만)
-- ============================================================
DROP POLICY IF EXISTS bsi_select ON public.zen_billing_statement_items;
CREATE POLICY bsi_select ON public.zen_billing_statement_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_billing_statements s
      WHERE s.id = statement_id
        AND (
          s.issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
          OR (s.billed_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
              AND s.status IN ('ISSUED', 'CLOSED'))
          OR (
            EXISTS (SELECT 1 FROM public.zen_profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('ADMIN','ZENITH_SUPER_ADMIN'))
            AND EXISTS (SELECT 1 FROM public.zen_organizations o
                        WHERE o.id = s.issuer_org_id AND o.type = 'AGENCY')
          )
        )
    )
  );

DROP POLICY IF EXISTS bsi_write ON public.zen_billing_statement_items;
CREATE POLICY bsi_write ON public.zen_billing_statement_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_billing_statements s
      WHERE s.id = statement_id
        AND s.issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        AND s.status = 'DRAFT'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zen_billing_statements s
      WHERE s.id = statement_id
        AND s.issuer_org_id = (SELECT org_id FROM public.zen_profiles WHERE id = auth.uid())
        AND s.status = 'DRAFT'
    )
  ); -- 발행 후 항목 변경은 여기서도 거부 + 트리거가 RAISE(이중)

COMMIT;

-- ============================================================
-- 9. 롤백 SQL (필요 시 주석 해제 후 실행)
-- ============================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_billing_statement_before_update ON public.zen_billing_statements;
-- DROP TRIGGER IF EXISTS trg_billing_statement_before_delete ON public.zen_billing_statements;
-- DROP TRIGGER IF EXISTS trg_billing_statement_items_guard ON public.zen_billing_statement_items;
-- DROP FUNCTION IF EXISTS public.billing_statement_before_update();
-- DROP FUNCTION IF EXISTS public.billing_statement_before_delete();
-- DROP FUNCTION IF EXISTS public.billing_statement_items_guard();
-- DROP FUNCTION IF EXISTS public.create_billing_statement(text, integer, integer, uuid, text, text, date, date);
-- DROP FUNCTION IF EXISTS public.next_billing_statement_seq(integer, integer);
-- DROP TABLE IF EXISTS public.zen_billing_statement_items;
-- DROP TABLE IF EXISTS public.zen_billing_statements;
-- DROP TABLE IF EXISTS public.zen_billing_statement_seq;
-- COMMIT;
