# TASK-122 — 요율 Slab 구조 개편 (무게 Slab / 부피 Slab 분리)

> **생성일**: 2026-06-08
> **발령자**: Aiden (Claude, ZEN_CEO)
> **담당 Agent**: D_Kai (DB 마이그레이션 + 엔진 수정) + B_Kai (UI 수정)
> **우선순위**: P2
> **전제조건**: TASK-121 ✅
> **IMP 연계**: IMP-106 (신규)

---

## 배경 및 목적

현재 `zen_rate_cards.tiers`는 무게 단가(`unit_price`)와 부피 단가(`cbm_price`)를 **동일 행에 혼합** 저장하는 구조다.
이로 인해 무게 구간 수와 부피 구간 수를 독립적으로 설정할 수 없고, 실무 요율 표현이 제한된다.

**요금 산정 정책(TASK-121)**이 도입되어 계산 시 어느 단가를 사용할지 정책이 결정하므로,
요율 등록 시에는 운송 수단에 관계없이 **무게 Slab**과 **부피 Slab**을 모두 독립 입력받는 구조로 개편한다.

---

## 신규 Tiers 구조

### AS-IS (배열)
```json
"tiers": [
  { "weight_min": 0,   "unit_price": 10, "cbm_price": 150, "min_total_price": 50 },
  { "weight_min": 100, "unit_price": 8,  "cbm_price": 120, "min_total_price": 50 }
]
```

### TO-BE (객체)
```json
"tiers": {
  "weight_slabs": [
    { "weight_min": 0,   "unit_price": 10, "min_charge": 50 },
    { "weight_min": 100, "unit_price": 8,  "min_charge": 50 }
  ],
  "cbm_slabs": [
    { "cbm_min": 0, "cbm_price": 150, "min_charge": 50 },
    { "cbm_min": 5, "cbm_price": 120, "min_charge": 50 }
  ]
}
```

**제약**:
- `weight_slabs` 최소 1개 이상 (저장 전 검증)
- `cbm_slabs` 최소 1개 이상 (저장 전 검증)

---

## Agent별 역할 분담

| Agent | 담당 범위 | 착수 조건 |
|:------|:---------|:---------|
| **D_Kai** | §1 DB 마이그레이션 + §3 엔진 수정 (rate-engine, SlabRateCalculator, SettlementEngine, SQL 함수) + §4 회귀 테스트 | 즉시 |
| **B_Kai** | §2 UI 수정 (RateTierEditor 분리 + RateCardForm + RateCardsTab + Server Actions) | D_Kai §1 DB 완료 후 |

---

## 구현 범위

### §1. DB 마이그레이션 (D_Kai)

**파일**: 신규 migration 파일 생성

1. **기존 데이터 변환** (`UPDATE zen_rate_cards`):
   - `tiers`가 배열인 경우 → `{ weight_slabs, cbm_slabs }` 객체로 변환
   - 변환 규칙:
     - `weight_slabs` = 기존 배열 각 항목에서 `{ weight_min, unit_price, min_charge: COALESCE(min_total_price, 0) }`
     - `cbm_slabs` = 기존 배열 각 항목에서 `cbm_price`가 존재하면 `{ cbm_min: weight_min, cbm_price, min_charge: COALESCE(min_total_price, 0) }`, 없으면 `[{ cbm_min: 0, cbm_price: 0, min_charge: 0 }]` (기본 1개)

2. **`fn_get_best_matching_rate` 수정** (4-arg 버전):
   - `jsonb_array_elements(v_tiers)` → `jsonb_array_elements(v_tiers->'weight_slabs')`
   - WM 분기: `jsonb_array_elements(v_tiers->'cbm_slabs')` 사용하여 cbm_price 조회

3. **`calculate_order_costs` 수정** (SQL 함수):
   - cbm_slabs 기반 cbm_price 조회로 변경

4. `supabase db push` 실행 후 기존 데이터 변환 확인

---

### §2. UI 수정 (B_Kai)

**대상 파일**:
- `src/components/admin/RateTierEditor.tsx`
- `src/components/admin/RateCardForm.tsx`
- `src/app/[locale]/(dashboard)/admin/rate-cards/RateCardsTab.tsx`
- `src/app/actions/admin/rate-cards.ts`

**RateTierEditor 개편**:

```
┌─────────────────────────────────────────────┐
│ ⚖️  무게 요율 (Weight Slabs)    [+ Add Slab] │
├──────────┬───────────────┬───────────────────┤
│ Min (kg) │ 단가 (통화/kg) │  최소 청구액        │
│   0      │    10.00      │    50.00          │
│  100     │     8.00      │    50.00          │
└──────────┴───────────────┴───────────────────┘

┌─────────────────────────────────────────────┐
│ 📦  부피 요율 (CBM Slabs)       [+ Add Slab] │
├──────────┬───────────────┬───────────────────┤
│ Min (㎥) │ 단가 (통화/㎥) │  최소 청구액        │
│   0      │   150.00      │    50.00          │
│   5      │   120.00      │    50.00          │
└──────────┴───────────────┴───────────────────┘
```

- `tiers` prop 타입 변경:
  ```typescript
  interface RateTiers {
    weight_slabs: { weight_min: number; unit_price: number; min_charge: number }[];
    cbm_slabs: { cbm_min: number; cbm_price: number; min_charge: number }[];
  }
  ```
- 각 섹션 독립 추가/삭제
- 저장 전 각 섹션 최소 1개 검증 (0개 시 저장 버튼 비활성화 + 에러 메시지)
- `currency` prop 유지 (라벨에 반영)

**RateCardsTab.tsx**:
- `RateCardFormRow` 컴포넌트 → RateTierEditor 재사용으로 교체
- `formData.tiers` 구조를 새 형식으로 변경
- 목록 테이블 Tiers 컬럼: `weight_slabs: N개, cbm_slabs: N개` 표시

**Server Actions (rate-cards.ts)**:
- `createRateCard` / `updateRateCard` payload에서 tiers 구조 검증 추가

---

### §3. TypeScript 엔진 수정 (D_Kai)

**`src/lib/logistics/rate-engine.ts`**:
```typescript
// 기존 RateTier 인터페이스 유지 (내부 연산용)
// calculateSlabRate 함수: 입력을 weight_slabs 배열로 받도록 수정
export function calculateWeightSlabRate(
  weight: number,
  weightSlabs: { weight_min: number; unit_price: number }[]
): number
```

**`src/lib/finance/settlement/slab-rate-calculator.ts`**:
- `bestRate.tiers` → `bestRate.tiers.weight_slabs` 참조로 변경
- `tiers.length` → `tiers.weight_slabs?.length`

**`src/lib/finance/settlement/settlement.ts`**:
- `getCbmPriceFromTiers(bestRate.tiers, weight)` → `getCbmPriceFromCbmSlabs(bestRate.tiers.cbm_slabs, cbm)` 로 변경
- cbm_slabs에서 `cbm_min` 기준으로 매칭하도록 수정

---

### §4. 회귀 테스트 업데이트 (D_Kai)

**`tests/integration/p6-transport-policy.test.ts`**:
- rate card 생성 시 `tiers` 구조를 신규 형식으로 수정
  ```typescript
  tiers: {
    weight_slabs: [{ weight_min: 0, unit_price: 10, min_charge: 0 }],
    cbm_slabs: [{ cbm_min: 0, cbm_price: 150, min_charge: 0 }]
  }
  ```
- 기타 rate card를 생성하는 테스트 파일 동일 수정

`LIVE_REGRESSION_TEST_MAP.md` 업데이트

---

## 커밋 순서 (R-17)

**D_Kai**:
1. `feat`: §1 DB 마이그레이션 (데이터 변환 + fn_get_best_matching_rate + calculate_order_costs)
2. `feat`: §3 TS 엔진 수정 (rate-engine + SlabRateCalculator + SettlementEngine)
3. `test`: §4 회귀 테스트 업데이트 + LIVE_REGRESSION_TEST_MAP.md
4. `docs`: TASK-122 🔔 완료 보고

**B_Kai** (D_Kai §1 완료 후 착수):
1. `feat`: §2 RateTierEditor 분리 + RateCardForm + RateCardsTab + Server Actions
2. `docs`: TASK-122 🔔 완료 보고

---

## DoD (완료 기준)

- [ ] `zen_rate_cards.tiers` 구조 `{ weight_slabs, cbm_slabs }` 변환 완료 (기존 데이터 포함)
- [ ] `fn_get_best_matching_rate` weight_slabs 기반 동작 확인
- [ ] `calculate_order_costs` cbm_slabs 기반 WM 계산 동작 확인
- [ ] `SlabRateCalculator` / `SettlementEngine` weight_slabs · cbm_slabs 참조 수정
- [ ] `RateTierEditor` 무게 Slab / 부피 Slab 섹션 분리 + 최소 1개 검증
- [ ] `RateCardsTab` 동일 구조 적용
- [ ] TC-POLICY-01~05 신규 tiers 구조 기준 전량 PASS
- [ ] 전체 회귀 테스트 PASS
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 업데이트

---

## 개정 이력

| 날짜 | 주체 | 내용 |
|:-----|:----:|:----|
| 2026-06-08 | Aiden (Claude) | TASK-122 신규 발령 — 요율 Slab 구조 개편 (무게/부피 분리). D_Kai+B_Kai 착수 지시. |
