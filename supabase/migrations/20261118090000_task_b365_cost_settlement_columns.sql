-- TASK-B-365 (Issue #1375): 오더정산 상태 컬럼 + UPS 실제원가 규칙 스냅샷 컬럼
-- 설계: .agent/tasks/TASK-B-358_261118_Issue1363_BillingCostSettlementDesign.md §3-1·§3-2 (PR #1373 병합, Jaison 승인)
-- 범위: **컬럼 추가만 — 서비스 영향 0. 백필 없음**(백필 배치는 운영 DB dry-run 승인 후 별도 발령).
-- 기존 `*_hkd`·`*_currency`·`applied_exchange_rate` 의미는 COMMENT로 고정 (§3-2 "의미 고정").

BEGIN;

-- ============================================================
-- 1. zen_orders: 오더정산 상태 (설계 §3-1)
-- ============================================================
ALTER TABLE public.zen_orders
  ADD COLUMN IF NOT EXISTS cost_settlement_status text NOT NULL DEFAULT 'NOT_SETTLED',
  ADD COLUMN IF NOT EXISTS cost_settled_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cost_settled_by uuid NULL;

-- 값 집합 제약 (2값 고정 — Q-F 승인)
ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_cost_settlement_status_check;
ALTER TABLE public.zen_orders ADD CONSTRAINT zen_orders_cost_settlement_status_check
  CHECK (cost_settlement_status IN ('NOT_SETTLED', 'SETTLED'));

-- SETTLED이면 settled_at·settled_by 필수 (설계 §3-1 CHECK)
ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_cost_settled_complete_check;
ALTER TABLE public.zen_orders ADD CONSTRAINT zen_orders_cost_settled_complete_check
  CHECK (
    cost_settlement_status <> 'SETTLED'
    OR (cost_settled_at IS NOT NULL AND cost_settled_by IS NOT NULL)
  );

-- 정산자 FK (감사 필수값 — 정산 이력 있는 프로필 하드 삭제 차단. DEF-B-158: (A)안 확정)
ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_cost_settled_by_fkey;
ALTER TABLE public.zen_orders ADD CONSTRAINT zen_orders_cost_settled_by_fkey
  FOREIGN KEY (cost_settled_by) REFERENCES public.zen_profiles (id) ON DELETE RESTRICT;

-- 부분 인덱스: UPS 오더 정산 현황 조회용
CREATE INDEX IF NOT EXISTS idx_zen_orders_cost_settlement
  ON public.zen_orders (cost_settlement_status, transport_mode)
  WHERE transport_mode = 'UPS';

COMMENT ON COLUMN public.zen_orders.cost_settlement_status IS '오더정산 상태 (NOT_SETTLED 기본 / SETTLED). SETTLED면 cost_settled_at·cost_settled_by 필수';
COMMENT ON COLUMN public.zen_orders.cost_settled_at IS '오더정산 완료 시각 (SETTLED 시점)';
COMMENT ON COLUMN public.zen_orders.cost_settled_by IS '오더정산 완료 처리자 (zen_profiles.id, FK ON DELETE RESTRICT — 정산 이력 있는 프로필은 삭제 불가)';
COMMENT ON INDEX public.idx_zen_orders_cost_settlement IS 'TASK-B-365: UPS 오더 정산 상태 부분 인덱스';

-- ============================================================
-- 2. zen_ups_actual_cost: 계산 규칙 스냅샷 신규 5컬럼 (설계 §3-2)
-- ============================================================
ALTER TABLE public.zen_ups_actual_cost
  ADD COLUMN IF NOT EXISTS cost_surcharge_rate numeric(6,4) NULL,
  ADD COLUMN IF NOT EXISTS cost_surcharge_amount_krw numeric(14,2) NULL,
  ADD COLUMN IF NOT EXISTS calc_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS applied_exchange_rates jsonb NULL,
  ADD COLUMN IF NOT EXISTS cost_legacy_snapshot jsonb NULL;

COMMENT ON COLUMN public.zen_ups_actual_cost.cost_surcharge_rate IS '적용 가산율 스냅샷 (신규 규칙: 0.07, 기본운임만 가산)';
COMMENT ON COLUMN public.zen_ups_actual_cost.cost_surcharge_amount_krw IS '가산액 KRW (base.krw − round(amount×rate))';
COMMENT ON COLUMN public.zen_ups_actual_cost.calc_version IS '계산 규칙 버전: 1=레거시/가산 없음, 2=신규 규칙(+7% 기본운임·항목별 통화)으로 계산한 값만';
COMMENT ON COLUMN public.zen_ups_actual_cost.applied_exchange_rates IS '사용 통화별 환율 스냅샷 {HKD:188.42, KRW:1} (재현·감사용)';
COMMENT ON COLUMN public.zen_ups_actual_cost.cost_legacy_snapshot IS '백필 前 원본 4컬럼+rate 스냅샷 (롤백 전용)';

-- ============================================================
-- 3. 기존 컬럼 의미 고정 (COMMENT — 신규 컬럼 아님, §3-2 "의미 고정")
-- ============================================================
COMMENT ON COLUMN public.zen_ups_actual_cost.base_freight_hkd IS '기본운임 **원금액** (통화는 base_freight_currency). 컬럼명 _hkd는 레거시 이름';
COMMENT ON COLUMN public.zen_ups_actual_cost.fuel_surcharge_hkd IS '유류할증료 **원금액** (통화는 fuel_surcharge_currency). 컬럼명 _hkd는 레거시 이름';
COMMENT ON COLUMN public.zen_ups_actual_cost.surge_fee_hkd IS '급증긴급수수료 **원금액** (통화는 surge_fee_currency). 컬럼명 _hkd는 레거시 이름';
COMMENT ON COLUMN public.zen_ups_actual_cost.other_charges_hkd IS '기타부가운임 **KRW 합계** (원금액·통화는 zen_ups_actual_other_charges 자식 행 보관)';
COMMENT ON COLUMN public.zen_ups_actual_cost.applied_exchange_rate IS '기본운임 통화→KRW 비율 (레거시 호환·표시용). KRW 입력이면 1 (Q-B). 전체 맵은 applied_exchange_rates 참조';
COMMENT ON COLUMN public.zen_ups_actual_cost.base_freight_currency IS '기본운임 통화 (HKD/USD/KRW 등) — base_freight_hkd에 대한 원통화';
COMMENT ON COLUMN public.zen_ups_actual_cost.fuel_surcharge_currency IS '유류할증료 통화 — fuel_surcharge_hkd에 대한 원통화';
COMMENT ON COLUMN public.zen_ups_actual_cost.surge_fee_currency IS '급증긴급수수료 통화 — surge_fee_hkd에 대한 원통화';

COMMIT;

-- ============================================================
-- 4. 롤백 SQL (필요 시 주석 해제 후 실행)
-- ============================================================
-- BEGIN;
-- ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_cost_settled_complete_check;
-- ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_cost_settlement_status_check;
-- ALTER TABLE public.zen_orders DROP CONSTRAINT IF EXISTS zen_orders_cost_settled_by_fkey;
-- ALTER TABLE public.zen_orders DROP COLUMN IF EXISTS cost_settlement_status;
-- ALTER TABLE public.zen_orders DROP COLUMN IF EXISTS cost_settled_at;
-- ALTER TABLE public.zen_orders DROP COLUMN IF EXISTS cost_settled_by;
-- DROP INDEX IF EXISTS public.idx_zen_orders_cost_settlement;
-- ALTER TABLE public.zen_ups_actual_cost DROP COLUMN IF EXISTS cost_surcharge_rate;
-- ALTER TABLE public.zen_ups_actual_cost DROP COLUMN IF EXISTS cost_surcharge_amount_krw;
-- ALTER TABLE public.zen_ups_actual_cost DROP COLUMN IF EXISTS calc_version;
-- ALTER TABLE public.zen_ups_actual_cost DROP COLUMN IF EXISTS applied_exchange_rates;
-- ALTER TABLE public.zen_ups_actual_cost DROP COLUMN IF EXISTS cost_legacy_snapshot;
-- COMMIT;
-- (백필 전 상태이므로 기존 4컬럼은 그대로 — data 복원 불필요. 총 cost_krw는 전 단계 불변.)
