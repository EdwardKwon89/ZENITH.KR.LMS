-- ============================================================================
-- TASK-B-381 (Issue #1459) M1 — UPS 정산 run 저장소(3테이블) + tier RLS + 불변 트리거
-- 설계: .agent/tasks/TASK-B-381_261123_Issue1459_SettlementChargeDesign.md §2-3·§2-9·§2-12
-- 적용 순서: M1 → M2 → M3 (앱 배포 전, 추가형). 운영 적용은 Aiden(Edward 승인, R-14).
-- 되돌리기: 아래 ROLLBACK 블록(DROP TABLE). 적용 전 데이터 없음(추가형).
-- ============================================================================

BEGIN;

-- 1) run 헤더 (append-only, 재정산은 새 version)
CREATE TABLE IF NOT EXISTS public.zen_ups_settlement_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES public.zen_orders(id) ON DELETE CASCADE,
  version          integer NOT NULL CHECK (version >= 1),
  charge_weight_kg numeric(10,2) NOT NULL CHECK (charge_weight_kg >= 0),
  currency         text NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  source           text NOT NULL DEFAULT 'UPS_SETTLEMENT',
  settled_at       timestamptz NOT NULL DEFAULT now(),
  settled_by       uuid REFERENCES public.zen_profiles(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zen_ups_settlement_runs_order_version_uq UNIQUE (order_id, version)
);
-- 주의: append-only 트리거 때문에 order_id ON DELETE CASCADE 는 오더 삭제 시 트리거 오류로 막힌다.
--       (오더 삭제 경로는 앱에서 미확정 — 삭제가 필요하면 데이터 작업으로 별도 처리)
--       settled_by 는 감사 목적상 ON DELETE RESTRICT(b365 DEF-B-158과 동일) — 프로필 삭제 시 명확한 FK 오류.

CREATE INDEX IF NOT EXISTS idx_zen_ups_settlement_runs_order
  ON public.zen_ups_settlement_runs (order_id, version DESC);

-- 2) tier별 금액 (한 run에 ADMIN_TO_AGENCY·SHIPPER 각 1행)
CREATE TABLE IF NOT EXISTS public.zen_ups_settlement_run_amounts (
  run_id                   uuid NOT NULL REFERENCES public.zen_ups_settlement_runs(id) ON DELETE CASCADE,
  tier                     text NOT NULL CHECK (tier IN ('ADMIN_TO_AGENCY','SHIPPER')),
  base_freight             numeric(14,2) NOT NULL DEFAULT 0,
  fuel_surcharge           numeric(14,2) NOT NULL DEFAULT 0,
  surge_fee                numeric(14,2) NOT NULL DEFAULT 0,
  other_charges            numeric(14,2) NOT NULL DEFAULT 0,
  freight_adjustment       numeric(14,2) NOT NULL DEFAULT 0,
  settlement_charges_total numeric(14,2) NOT NULL DEFAULT 0,
  line_total               numeric(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT zen_ups_settlement_run_amounts_pk PRIMARY KEY (run_id, tier)
);

-- 3) tier별 부가운임 항목(같은 이름 중복 허용)
CREATE TABLE IF NOT EXISTS public.zen_ups_settlement_run_charges (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id   uuid NOT NULL REFERENCES public.zen_ups_settlement_runs(id) ON DELETE CASCADE,
  tier     text NOT NULL CHECK (tier IN ('ADMIN_TO_AGENCY','SHIPPER')),
  line_no  integer NOT NULL CHECK (line_no >= 1),
  name     text NOT NULL CHECK (btrim(name) <> ''),
  amount   numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KRW' CHECK (currency = 'KRW'),
  CONSTRAINT zen_ups_settlement_run_charges_uq UNIQUE (run_id, tier, line_no)
);

CREATE INDEX IF NOT EXISTS idx_zen_ups_settlement_run_charges_run
  ON public.zen_ups_settlement_run_charges (run_id, tier, line_no);

COMMENT ON TABLE public.zen_ups_settlement_runs IS
  'TASK-B-381 M1: UPS 정산 run 헤더(append-only). 표시·청구 단일 소스. 쓰기는 DEFINER RPC만.';
COMMENT ON TABLE public.zen_ups_settlement_run_amounts IS
  'TASK-B-381 M1: run tier별 금액. freight_adjustment = target - (base+fuel+surge+other), line_total = 4개 합 + 조정 + 부가항목 합.';
COMMENT ON TABLE public.zen_ups_settlement_run_charges IS
  'TASK-B-381 M1: run tier별 부가운임 항목(항목명 보존). 같은 이름 중복 허용.';

-- 4) 불변성: UPDATE/DELETE 차단 (append-only)
CREATE OR REPLACE FUNCTION public.zen_ups_settlement_run_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ups_settlement_run_immutable: % on %', TG_OP, TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_zen_ups_settlement_runs_immutable ON public.zen_ups_settlement_runs;
CREATE TRIGGER trg_zen_ups_settlement_runs_immutable
  BEFORE UPDATE OR DELETE ON public.zen_ups_settlement_runs
  FOR EACH ROW EXECUTE FUNCTION public.zen_ups_settlement_run_immutable();

DROP TRIGGER IF EXISTS trg_zen_ups_settlement_run_amounts_immutable ON public.zen_ups_settlement_run_amounts;
CREATE TRIGGER trg_zen_ups_settlement_run_amounts_immutable
  BEFORE UPDATE OR DELETE ON public.zen_ups_settlement_run_amounts
  FOR EACH ROW EXECUTE FUNCTION public.zen_ups_settlement_run_immutable();

DROP TRIGGER IF EXISTS trg_zen_ups_settlement_run_charges_immutable ON public.zen_ups_settlement_run_charges;
CREATE TRIGGER trg_zen_ups_settlement_run_charges_immutable
  BEFORE UPDATE OR DELETE ON public.zen_ups_settlement_run_charges
  FOR EACH ROW EXECUTE FUNCTION public.zen_ups_settlement_run_immutable();

-- 5) RLS: SELECT 정책만, 쓰기는 DEFINER RPC
ALTER TABLE public.zen_ups_settlement_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_settlement_run_amounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zen_ups_settlement_run_charges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.zen_ups_settlement_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.zen_ups_settlement_run_amounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.zen_ups_settlement_run_charges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.zen_ups_settlement_runs TO authenticated, service_role;
GRANT SELECT ON TABLE public.zen_ups_settlement_run_amounts TO authenticated, service_role;
GRANT SELECT ON TABLE public.zen_ups_settlement_run_charges TO authenticated, service_role;

-- run 헤더: 관리자 전체 / 화주 본인 / 대리점(자기 청구·소속 화주)
DROP POLICY IF EXISTS zen_ups_settlement_runs_select ON public.zen_ups_settlement_runs;
CREATE POLICY zen_ups_settlement_runs_select ON public.zen_ups_settlement_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('ADMIN','ZENITH_SUPER_ADMIN','MANAGER')
    )
    OR EXISTS (
      SELECT 1
      FROM public.zen_profiles p
      JOIN public.zen_orders o ON o.id = zen_ups_settlement_runs.order_id
      WHERE p.id = auth.uid()
        AND p.org_id IS NOT NULL
        AND (
          o.shipper_id = p.org_id
          OR (p.role = 'AGENCY' AND o.agency_org_id = p.org_id)
          OR (p.role = 'AGENCY' AND EXISTS (
                SELECT 1 FROM public.zen_agency_shippers s
                WHERE s.agency_org_id = p.org_id
                  AND s.shipper_org_id = o.shipper_id
                  AND s.is_active = true
              ))
        )
    )
  );

-- 금액: tier 단위로 제한 (SHIPPER는 대리점 매입가 0건)
DROP POLICY IF EXISTS zen_ups_settlement_run_amounts_select ON public.zen_ups_settlement_run_amounts;
CREATE POLICY zen_ups_settlement_run_amounts_select ON public.zen_ups_settlement_run_amounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('ADMIN','ZENITH_SUPER_ADMIN','MANAGER')
    )
    OR EXISTS (
      SELECT 1
      FROM public.zen_ups_settlement_runs r
      JOIN public.zen_orders o ON o.id = r.order_id
      JOIN public.zen_profiles p ON p.id = auth.uid()
      WHERE r.id = zen_ups_settlement_run_amounts.run_id
        AND p.org_id IS NOT NULL
        AND (
          (zen_ups_settlement_run_amounts.tier = 'ADMIN_TO_AGENCY'
            AND p.role = 'AGENCY' AND o.agency_org_id = p.org_id)
          OR (zen_ups_settlement_run_amounts.tier = 'SHIPPER'
            AND (
              o.shipper_id = p.org_id
              OR (p.role = 'AGENCY' AND EXISTS (
                    SELECT 1 FROM public.zen_agency_shippers s
                    WHERE s.agency_org_id = p.org_id
                      AND s.shipper_org_id = o.shipper_id
                      AND s.is_active = true
                  ))
            ))
        )
    )
  );

-- 항목: 금액과 동일 tier 규칙
DROP POLICY IF EXISTS zen_ups_settlement_run_charges_select ON public.zen_ups_settlement_run_charges;
CREATE POLICY zen_ups_settlement_run_charges_select ON public.zen_ups_settlement_run_charges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.zen_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('ADMIN','ZENITH_SUPER_ADMIN','MANAGER')
    )
    OR EXISTS (
      SELECT 1
      FROM public.zen_ups_settlement_runs r
      JOIN public.zen_orders o ON o.id = r.order_id
      JOIN public.zen_profiles p ON p.id = auth.uid()
      WHERE r.id = zen_ups_settlement_run_charges.run_id
        AND p.org_id IS NOT NULL
        AND (
          (zen_ups_settlement_run_charges.tier = 'ADMIN_TO_AGENCY'
            AND p.role = 'AGENCY' AND o.agency_org_id = p.org_id)
          OR (zen_ups_settlement_run_charges.tier = 'SHIPPER'
            AND (
              o.shipper_id = p.org_id
              OR (p.role = 'AGENCY' AND EXISTS (
                    SELECT 1 FROM public.zen_agency_shippers s
                    WHERE s.agency_org_id = p.org_id
                      AND s.shipper_org_id = o.shipper_id
                      AND s.is_active = true
                  ))
            ))
        )
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (주석 해제 후 실행 — 앱 RPC 호출 제거를 먼저 배포할 것)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.zen_ups_settlement_run_charges;
-- DROP TABLE IF EXISTS public.zen_ups_settlement_run_amounts;
-- DROP TABLE IF EXISTS public.zen_ups_settlement_runs;
-- DROP FUNCTION IF EXISTS public.zen_ups_settlement_run_immutable();
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
-- ============================================================================
