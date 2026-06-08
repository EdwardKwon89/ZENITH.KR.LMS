# TASK-125 — IMP-107 TISA 요율 스냅샷 강화 (WM slab 이력 + pricing_basis 저장)

> **Task ID**: TASK-125
> **생성일**: 2026-06-09
> **발령자**: Aiden (Claude)
> **담당 Agent**: D_Kai (OpenCode)
> **관련 IMP**: IMP-107
> **우선순위**: P3
> **전제조건**: TASK-124 ✅ (applied_pricing_basis 'MAX_CHARGE' 완성 후)

---

## 목표 (Goal)

`zen_order_rate_snapshots` 테이블에 WM slab 매칭 이력과 요금 산정 기준(pricing_basis)을 저장하여, 배송의뢰·확정 시점의 운임 계산 전 과정을 감사 추적 가능하도록 강화한다.

---

## 배경

### 현재 스냅샷 저장 상태

`zen_order_rate_snapshots`에는:
- `applied_unit_price` — 적용 단가
- `carrier_cost_amount` — carrier_cost (IMP-108 §2 이후 NULL 가능)
- `platform_fee_amount` — 수수료

### 누락 정보 (추적 불가)
- **어떤 weight slab / cbm slab이 매칭됐는지** — slab 변경 후 재현 불가
- **실제 weight_cost · cbm_cost 계산 금액** — 중간 계산 복원 불가
- **최종 요금 산정 기준** (WEIGHT / CBM / MIN_CHARGE / MAX_CHARGE) — 감사 추적 불가

### 목표 추가 컬럼

```sql
applied_weight_slab_min   NUMERIC,  -- 매칭된 weight slab의 weight_min
applied_weight_unit_price NUMERIC,  -- 해당 slab의 unit_price (kg당)
applied_cbm_slab_min      NUMERIC,  -- 매칭된 cbm slab의 cbm_min (WM 모드만)
applied_cbm_price         NUMERIC,  -- 해당 slab의 cbm_price (㎥당, WM 모드만)
applied_weight_cost       NUMERIC,  -- actual_weight × unit_price 계산 금액
applied_cbm_cost          NUMERIC,  -- cargo_cbm × cbm_price 계산 금액 (WM 모드만)
applied_pricing_basis     TEXT,     -- 'WEIGHT' | 'CBM' | 'MIN_CHARGE' | 'MAX_CHARGE'
tiers_snapshot            JSONB     -- 적용 시점 tiers 전체 객체 (요율 변경 후 재현용)
```

---

## 작업 범위

### §1 — DB 마이그레이션: zen_order_rate_snapshots 컬럼 추가

**파일**: `supabase/migrations/20260609200000_imp107_rate_snapshot_enhance.sql`

```sql
ALTER TABLE public.zen_order_rate_snapshots
  ADD COLUMN IF NOT EXISTS applied_weight_slab_min   NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_weight_unit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_cbm_slab_min      NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_cbm_price         NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_weight_cost       NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_cbm_cost          NUMERIC,
  ADD COLUMN IF NOT EXISTS applied_pricing_basis     TEXT
    CHECK (applied_pricing_basis IN ('WEIGHT', 'CBM', 'MIN_CHARGE', 'MAX_CHARGE')),
  ADD COLUMN IF NOT EXISTS tiers_snapshot            JSONB;
```

---

### §2 — `calculate_order_costs` 스냅샷 저장 보강

`zen_order_rate_snapshots` INSERT/UPDATE 시 신규 컬럼 값 기록:

```sql
-- fn_get_best_matching_rate (4-arg) 호출 후 slab 정보 추출
-- matched_weight_slab, matched_cbm_slab 변수에서 추출

INSERT INTO public.zen_order_rate_snapshots (
    order_id, rate_card_id, snapshot_date,
    applied_unit_price, carrier_cost_amount, platform_fee_amount,
    -- 신규
    applied_weight_slab_min,   applied_weight_unit_price,
    applied_cbm_slab_min,      applied_cbm_price,
    applied_weight_cost,       applied_cbm_cost,
    applied_pricing_basis,     tiers_snapshot
)
VALUES (
    p_order_id, v_rate_card_id, NOW(),
    v_tier_unit_price, NULL, v_platform_fee_amount,
    -- 신규
    v_matched_weight_slab_min, v_tier_unit_price,
    v_matched_cbm_slab_min,    v_tier_cbm_price,
    v_weight_cost,             v_cbm_cost,
    v_applied_basis,
    (SELECT tiers FROM public.zen_rate_cards WHERE id = v_rate_card_id)
);
```

> `v_applied_basis`는 TASK-124 §3에서 `calculate_order_costs`가 반환하는 값 재사용.

---

### §3 — `tisa.ts` 반환값 업데이트 (선택적)

`src/app/actions/operations/tisa.ts`에서 스냅샷 조회 시 신규 컬럼 포함 여부 확인.
Rate Preview Simulator에서 `applied_pricing_basis` 표시 필요 시 UI 추가 (선택).

---

## DoD (완료 기준)

- [ ] `zen_order_rate_snapshots` 마이그레이션 적용 — 8개 컬럼 추가 확인
- [ ] `calculate_order_costs` 호출 후 스냅샷에 `applied_pricing_basis` 정상 저장 확인
- [ ] `tiers_snapshot` JSONB에 적용 시점 tiers 전체 저장 확인
- [ ] `rtk npm run build` PASS — 커밋 해시 기재
- [ ] `rtk npm run test:regression` PASS — 커밋 해시 기재
- [ ] 신규 회귀 TC 추가 — 스냅샷 컬럼 저장 검증 최소 1개
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 업데이트

---

## R-17 완료 보고 절차

1. **[코드 커밋]** `[D_Kai] feat: IMP-107 TISA 스냅샷 강화 — slab 이력 + pricing_basis` — 코드·회귀파일만
2. **상세 파일 `[작업 결과]` 기재** — 커밋 해시 포함 + 상태 🔔 변경
3. **ACTIVE_TASK.md 🔄→🔔** 반영
4. **`scratch/IMP_PROGRESS.md` IMP-107 🔔 갱신**
5. **DoD 실물 검증** — 전항목 `[x]` + 증거값 기재
6. **[문서 커밋]** `[D_Kai] docs: TASK-125 완료 보고 — task file 🔔`

---

## [설계 의견] — D_Kai 작성란

> (복잡도 판단 후 필요 시 작성)

---

## [설계 확정] — Aiden 전속

> - 기존 스냅샷 행 소급 업데이트 없음 — 이후 신규 calculate_order_costs 호출분부터 적용
> - tiers_snapshot은 현재 rate_card의 tiers 전체 JSONB 복사 저장 (이력 재현용)
> - applied_cbm_* 컬럼은 WM 모드 이외에서 NULL 허용

---

## [작업 결과] — D_Kai 작성란

> 완료 후 기재

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------:|:-----|
| 2026-06-09 | Aiden (Claude) | 최초 발령 — IMP-107 TISA 스냅샷 강화. D_Kai 착수. 전제조건 TASK-124 ✅. |
