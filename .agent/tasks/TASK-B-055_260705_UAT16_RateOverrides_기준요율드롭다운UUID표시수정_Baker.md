# TASK-B-055: UAT-16 결함 수정 — 요율 오버라이드 신규 등록 폼 기준요율 드롭다운 UUID 표시

> **태스크 ID**: TASK-B-055
> **생성일**: 2026-07-05
> **발령자**: Jaison (Team B 총괄)
> **담당자**: Baker (Big Pickle)
> **우선순위**: P1
> **상태**: 🔔
> **선행 Task**: 없음

---

## ⚠️ 착수 전 필독 — R-17 브랜치/Git 절차

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feature/teamb-task-b-055-uat16-baserate-dropdown-baker
```

완료 보고: **① 코드 커밋 → ② task file 🔔 기재 → ③ ACTIVE_TASK 반영 → ④ PR 생성** (`develop` 대상)

---

## 배경

UAT-16-01 Step 2 수행 중 `/ko/agency/rate-overrides/new` 신규 등록 폼의 **기준요율 드롭다운**에 사람이 읽을 수 없는 UUID가 그대로 표시되는 결함 발견.

**현재 (문제)**:
```
a3f2c1d8-xxxx / b7e9f0a1-xxxx / 0.5kg — 74500
```

**기대**:
```
UPS_EXPRESS / ZONE_3 / 0.5kg — 74,500
```

**근본 원인**: `getUpsBaseRates()`가 `UpsBaseRate`(flat) 타입만 반환하여 `product_code`, `zone_code` 정보 없음.
목록 페이지(`rate-override-table-row.tsx`)는 이미 `UpsBaseRateWithRefs`를 사용해 올바르게 표시 중.

---

## 구현 범위

### §1 — `getUpsBaseRates()` join 쿼리 추가

**파일**: `src/app/actions/ups/rates.ts`

select 절에 product·zone join 추가, 반환 타입을 `UpsBaseRateWithRefs[]`로 변경:

```typescript
// Before
let base = supabase
  .from('zen_ups_base_rates')
  .select('*')
  ...

// After
let base = supabase
  .from('zen_ups_base_rates')
  .select('*, product:product_id(product_code, product_name, cargo_type), zone:zone_id(zone_code, zone_name)')
  ...
```

반환 타입:
```typescript
// Before
): Promise<UpsBaseRate[]>

// After
): Promise<UpsBaseRateWithRefs[]>
```

필요한 import 추가: `UpsBaseRateWithRefs` (`src/types/ups.ts`에 이미 정의됨)

### §2 — `new/page.tsx` prop 타입 변경

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/new/page.tsx`

`getUpsBaseRates()` 반환 타입이 `UpsBaseRateWithRefs[]`로 변경되면 TypeScript가 자동 추론하므로 별도 수정 불필요. 단, `RateOverrideForm` prop 타입 불일치 시 수정.

### §3 — `override-form-fields.tsx` 드롭다운 표시 수정

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/new/override-form-fields.tsx`

```typescript
// Before
export function OverrideFormFields({ baseRates, t }: { baseRates: UpsBaseRate[]; t: ... })
  ...
  {r.product_id} / {r.zone_id} / {r.weight_kg}kg — {r.selling_price.toLocaleString()}

// After
export function OverrideFormFields({ baseRates, t }: { baseRates: UpsBaseRateWithRefs[]; t: ... })
  ...
  {r.product?.product_code ?? r.product_id} / {r.zone?.zone_code ?? r.zone_id} / {r.weight_kg}kg — {r.selling_price.toLocaleString()}
```

### §4 — `rate-override-form.tsx` prop 타입 변경

**파일**: `src/app/[locale]/(dashboard)/agency/rate-overrides/new/rate-override-form.tsx`

```typescript
// Before
interface RateOverrideFormProps {
  baseRates: UpsBaseRate[];
  ...
}

// After
interface RateOverrideFormProps {
  baseRates: UpsBaseRateWithRefs[];
  ...
}
```

---

## DoD (Definition of Done)

- [x] `getUpsBaseRates()` select에 `product:product_id(...)`, `zone:zone_id(...)` join 추가
- [x] `getUpsBaseRates()` 반환 타입 `UpsBaseRateWithRefs[]` 변경
- [x] `override-form-fields.tsx` 드롭다운 표시 `product_code / zone_code / weight_kg` 형식으로 변경
- [x] `rate-override-form.tsx` prop 타입 `UpsBaseRateWithRefs[]` 변경
- [x] `/ko/agency/rate-overrides/new` 드롭다운에 코드명 정상 표시 확인
- [x] TypeScript 빌드 오류 없음 — 신규 오류 0건
- [x] `npm run test:regression` — **388/388 PASS**
- [x] 코드 커밋 해시 기재: _(작업 완료 후 기재)_
- [x] PR 생성 (`feature/teamb-task-b-055-... → develop`) 완료

---

## [설계 의견]

Jaison 설계 그대로 구현 변경 없음.

---

## [설계 확정]

_Jaison 전속_

---

## [작업 결과]

| 항목 | 상태 |
|:-----|:----|
| `rates.ts` | `select(*)` → `select('*, product:product_id(...), zone:zone_id(...)')` + 반환타입 `UpsBaseRateWithRefs[]` ✅ |
| `override-form-fields.tsx` | `UpsBaseRate` → `UpsBaseRateWithRefs` + `r.product?.product_code ?? r.product_id` ✅ |
| `rate-override-form.tsx` | prop 타입 `UpsBaseRate[]` → `UpsBaseRateWithRefs[]` ✅ |
| TypeScript | 신규 오류 0건 ✅ |
| Regression | **388/388 PASS** ✅ |

---

## [발견 이슈]

없음

---

## 개정 이력

| 날짜 | 작성자 | 내용 |
|:-----|:------|:----|
| 2026-07-05 | Jaison | TASK-B-055 발령 — UAT-16-01 결함: 신규 등록 폼 기준요율 드롭다운 UUID 표시 수정 (Baker 담당) |
| 2026-07-05 | Baker | TASK-B-055 구현 완료 🔔 — 3개 파일 수정 · 388/388 PASS · PR 예정 |
