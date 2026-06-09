# TASK-124 — IMP-108 §1+§3 max_charge 상한선 구현 (WM Cap + UI)

> **Task ID**: TASK-124
> **생성일**: 2026-06-09
> **발령자**: Aiden (Claude)
> **담당 Agent**: D_Kai (§3 엔진) · B_Kai (§1 UI) 병렬 진행
> **관련 IMP**: IMP-108 §1 · §3
> **우선순위**: P2
> **전제조건**: TASK-123 ✅

---

## 목표 (Goal)

1. **§1 (B_Kai)**: `WeightSlab` · `CbmSlab` 인터페이스에 `max_charge?: number` 추가 + RateTierEditor UI 필드 구현
2. **§3 (D_Kai)**: `calculate_order_costs`에서 WM 상한선(cap) 적용 — `CLAMP(max(weight_cost, cbm_cost), min=min_charge, max=max_charge)` + `applied_pricing_basis` 반환

> IMP-108 §2(platform_fee 재정의)는 TASK-123에서 완료.

---

## 배경

### WM 요금 한도 정책 (설계 확정)

| 한도 유형 | 역할 | 적용 조건 | applied_pricing_basis |
|:---------|:----|:---------|:----------------------|
| `min_charge` (하한선) | 최소 보장 금액 — 화물이 가벼워도 이 금액 이상 청구 | `freight < min_charge` | `MIN_CHARGE` |
| `max_charge` (상한선) | 최대 청구 금액 — 화물이 커도 이 금액 이상 청구 안 함 | `freight > max_charge` | `MAX_CHARGE` |

**현재 구현**: `min_charge` 적용 (`GREATEST(freight, min_charge)`)  
**누락**: `max_charge` 상한선 미구현 → 이 Task에서 구현

### Slab JSONB 현행 구조 (IMP-106 완료 후)
```json
{
  "weight_slabs": [{ "weight_min": 0, "unit_price": 5.5, "min_charge": 55 }],
  "cbm_slabs": [{ "cbm_min": 0, "cbm_price": 200, "min_charge": 55 }]
}
```

### 목표 구조
```json
{
  "weight_slabs": [{ "weight_min": 0, "unit_price": 5.5, "min_charge": 55, "max_charge": 500 }],
  "cbm_slabs": [{ "cbm_min": 0, "cbm_price": 200, "min_charge": 55, "max_charge": 500 }]
}
```
> `max_charge`는 선택(optional) — NULL이면 상한선 없음

---

## 작업 범위

### §1 (B_Kai) — UI: max_charge 필드 추가

**수정 파일**: `src/components/admin/RateTierEditor.tsx`

**WeightSlab 인터페이스 변경**:
```typescript
export interface WeightSlab {
  weight_min: number;
  unit_price: number;
  min_charge: number;
  max_charge?: number;   // 신규 추가 (선택)
}

export interface CbmSlab {
  cbm_min: number;
  cbm_price: number;
  min_charge: number;
  max_charge?: number;   // 신규 추가 (선택)
}
```

**UI 변경**:
- WeightSlab 행 편집 폼에 `max_charge` 입력 필드 추가 (라벨: "최대 요금(선택)")
- CbmSlab 행 편집 폼에 동일 필드 추가
- 미입력 시 필드 생략(NULL 저장)
- 기존 데이터 호환 — `max_charge` 없는 기존 Slab 정상 렌더링

**추가 검토 파일**:
- `src/app/actions/admin/rates.ts` — createRateCard / updateRateCard에서 tiers 저장 시 max_charge 통과 확인

---

### §3 (D_Kai) — 엔진: CLAMP 로직 + applied_pricing_basis

**수정 파일**: 신규 마이그레이션 (`supabase/migrations/20260609150000_imp108_wm_cap_logic.sql`)

#### 1. `fn_get_best_matching_rate` (4-arg) 반환 컬럼에 `max_total_price` 추가

현재 RETURNS TABLE:
```sql
RETURNS TABLE(
    unit_price      NUMERIC,
    cbm_price       NUMERIC,
    min_total_price NUMERIC
)
```

변경 후:
```sql
RETURNS TABLE(
    unit_price      NUMERIC,
    cbm_price       NUMERIC,
    min_total_price NUMERIC,
    max_total_price NUMERIC    -- 신규: max_charge 상한선 (NULL이면 상한 없음)
)
```

JSONB 추출 로직 (weight_slabs 매칭 시):
```sql
(matched_slab->>'max_charge')::NUMERIC  AS max_total_price
```

#### 2. `calculate_order_costs` CLAMP 로직 추가

```sql
-- 7. 운임(total_freight) 산정 — WM 방식
DECLARE
    v_tier_max_total_price  NUMERIC;
    v_applied_basis         TEXT;

-- fn 호출 시 max_total_price도 추출
SELECT unit_price, cbm_price, min_total_price, max_total_price
INTO v_tier_unit_price, v_tier_cbm_price, v_tier_min_total_price, v_tier_max_total_price
FROM public.fn_get_best_matching_rate(...);

-- WM CLAMP 적용
IF v_policy.pricing_method = 'WM' THEN
    v_weight_cost := v_actual_weight * v_tier_unit_price;
    v_cbm_cost := v_cargo_cbm * COALESCE(v_tier_cbm_price, 0.0);
    v_total_freight := GREATEST(v_weight_cost, v_cbm_cost);
    -- pricing_basis 결정 (cap 적용 전)
    v_applied_basis := CASE WHEN v_weight_cost >= v_cbm_cost THEN 'WEIGHT' ELSE 'CBM' END;
END IF;

-- min_charge 적용
IF v_total_freight < COALESCE(v_tier_min_total_price, 0) THEN
    v_total_freight := v_tier_min_total_price;
    v_applied_basis := 'MIN_CHARGE';
END IF;

-- max_charge 적용 (cap)
IF v_tier_max_total_price IS NOT NULL AND v_tier_max_total_price > 0
   AND v_total_freight > v_tier_max_total_price THEN
    v_total_freight := v_tier_max_total_price;
    v_applied_basis := 'MAX_CHARGE';
END IF;
```

#### 3. `RETURNS JSONB`에 `applied_pricing_basis` 포함

```sql
RETURN jsonb_build_object(
    'total_freight',          v_total_freight,
    'platform_fee_amount',    v_platform_fee_amount,
    'applied_pricing_basis',  v_applied_basis,   -- 신규
    ...
);
```

**관련 파일 확인**:
- `src/app/actions/operations/tisa.ts` — 반환값에 `applied_pricing_basis` 필요 시 처리

---

## DoD (완료 기준)

- [x] `WeightSlab.max_charge?: number` · `CbmSlab.max_charge?: number` 인터페이스 추가 — `src/components/admin/RateTierEditor.tsx:10·17`
- [x] RateTierEditor UI에 max_charge 입력 필드 노출 (선택, 미입력 허용) — `src/components/admin/RateTierEditor.tsx` weight slab·CBM slab 행 각 1개 필드
- [ ] fn_get_best_matching_rate (4-arg) `max_total_price` 컬럼 반환 확인 — §3 D_Kai
- [ ] WM 모드에서 max_charge cap 적용 — §3 D_Kai
- [ ] `applied_pricing_basis` 반환값 검증 — §3 D_Kai
- [x] `rtk npm run build` PASS — B_Kai `ce17476` ✅ / D_Kai
- [x] `rtk npm run test:regression` 314/314 PASS — B_Kai `ce17476` ✅ / D_Kai
- [ ] 신규 회귀 TC 추가 — §3 D_Kai
- [ ] `LIVE_REGRESSION_TEST_MAP.md` 업데이트 — §3 D_Kai

---

## R-17 완료 보고 절차

**병렬 진행 시 커밋 순서 (D_Kai + B_Kai 각자 독립)**:

1. **[각자 코드 커밋]** — 코드·회귀파일만 포함 (⚠️ 문서 파일 포함 금지 — D_Kai TASK-123 위반 경고 1회)
2. **상세 파일 `[작업 결과]` 섹션 각자 기재** — 커밋 해시 포함 + 상태 변경
3. **ACTIVE_TASK.md 상태 반영** — D_Kai·B_Kai 양자 완료 후 🔔
4. **`scratch/IMP_PROGRESS.md` IMP-108 §1·§3 🔔 갱신**
5. **DoD 실물 검증** — 모든 항목 `[x]` + 증거값
6. **[문서 커밋]** `[D_Kai+B_Kai] docs: TASK-124 완료 보고 — task file 🔔`

> ⚠️ D_Kai: 이전 TASK-123에서 코드 커밋에 문서 파일 포함 → 동일 유형 위반 1회 기록. 이번부터 엄수.

---

## [설계 의견] — D_Kai/B_Kai 작성란

> (복잡도 판단 후 필요 시 작성)

---

## [설계 확정] — Aiden 전속

> - max_charge는 WeightSlab/CbmSlab 모두에 optional 필드로 추가 (DB 스키마 변경 없이 JSONB 확장)
> - applied_pricing_basis 4가지: WEIGHT / CBM / MIN_CHARGE / MAX_CHARGE
> - min_charge가 먼저 적용된 후 max_charge 적용 (min > max 충돌은 max_charge 우선)
> - max_charge UI는 선택 입력 (미입력 = 상한 없음)

---

## [작업 결과] — D_Kai/B_Kai 작성란

### §1 (B_Kai) — max_charge UI ✅ 완료

**수정 파일**:
- `src/components/admin/RateTierEditor.tsx` — WeightSlab/CbmSlab 인터페이스에 `max_charge?: number` 추가, max_charge 핸들러 및 UI 입력 필드 추가 (Weight·CBM 양쪽)
- `src/app/actions/admin/rates.ts` — createRateCard·updateRateCard 타입에 `max_charge?: number` 추가

**검증 결과**:
- `rtk npm run build` — ✅ PASS
- `rtk npm run test:regression` — ✅ 314/314 PASS

**커밋**: `ce17476`

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------:|:-----|
| 2026-06-09 | Aiden (Claude) | 최초 발령 — IMP-108 §1(max_charge UI) + §3(WM cap 엔진). D_Kai + B_Kai 병렬 착수. |
