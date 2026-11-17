# TASK-B-358 — Issue #1363: 오더정산 상태 + UPS 실제원가 계산 통합 [설계 의견]

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1363](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1363) (에픽 #1364 / 설계서 `docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md`) |
| **담당(Worker)** | Dave (Team B) — Baker에서 변경 배정 |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-18 |
| **단계** | **설계 의견만** — `src/`·`messages/`·`supabase/migrations/` 수정 금지 |
| **브랜치** | `feature/teamb-task-b358-iss1363-billing-cost-settlement-design` (base: develop 동기화 반영 — 동기화 PR #1372 참조) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-358*"` → **0건** 확인 |
| **참고** | An_17 §2-1·§3-1·§3-1b·§5-1·§7~§10 (JSJung 승인 2026-11-18) |

## 0. 착수 전 기준 측정 (실제 출력)

```bash
$ grep -n "1.07\|UPS_COST_SURCHARGE_RATE" src/app/actions/finance/ups-actual-cost.ts src/lib/ups/pricing-engine.ts
src/app/actions/finance/ups-actual-cost.ts:522:      baseFreightKrw = Math.round(baseFreightInput * 1.07); // KRW는 +7% 적용
src/app/actions/finance/ups-actual-cost.ts:526:      baseFreightKrw = Math.round(baseFreightInput * currencyExchangeRate * 1.07);
src/lib/ups/pricing-engine.ts:22:export const UPS_COST_SURCHARGE_RATE = 0.07;
src/lib/ups/pricing-engine.ts:241: costSurchargeRate: UPS_COST_SURCHARGE_RATE
src/lib/ups/pricing-engine.ts:319,334,344,362: baseCostPrice = … * (1 + UPS_COST_SURCHARGE_RATE)

$ grep -rn "recordUpsActualCost\|recordActualCostAndFinalize\|previewUpsActualCost" src --include='*.ts' --include='*.tsx' | grep -v "^src/app/actions/finance/ups-actual-cost.ts"
src/components/finance/BillingConfirmModal.tsx:6,98   (recordActualCostAndFinalize)
src/components/orders/UpsActualAdjustmentForm.tsx:5,125,143 (preview/record)

$ grep -rln "recordUpsActualCost\|recordActualCostAndFinalize\|zen_ups_actual_cost" tests | wc -l
3
```
- `Errors` 키 현황: **90키**(B-356까지). 신규 오류 키는 이 네임스페이스에 추가하는 것을 전제로 설계.

## 1. 현행 조사표 (실측 — 파일:줄)

| 경로 | 함수/호출부 | 가산(+7%) | 환율 적용 | 저장값 의미 | 비고 |
|:--|:--|:--|:--|:--|:--|
| **A. 청구확정 모달** | `recordActualCostAndFinalize` (`ups-actual-cost.ts:472`) / `BillingConfirmModal.tsx:98` | **적용** — 기본운임만 `×1.07` (`ups-actual-cost.ts:522,526`) | `getOrderReleasedDate` + `getExchangeRate` (`:518~527,551`) | `base_freight_hkd` 컬럼에 **KRW** 저장 (`:544` `base_freight_hkd: baseFreightKrw`) | 유류·급증·기타는 입력 KRW 그대로(`:529~531`), `applied_exchange_rate`에는 기본운임 통화→KRW 환율 저장(`:551`) |
| **B. 오더 상세 원가 폼** | `recordUpsActualCost` (`ups-actual-cost.ts:156`) / `UpsActualAdjustmentForm.tsx:143` | **미적용** | `hkdTotal × exchangeRate` (`:231`) | `base_freight_hkd`에 **HKD 원값** 저장 (`:214`) | `fuel/surge/other`도 HKD 원값. `total_cost_krw`만 KRW |
| **C. 미리보기** | `previewUpsActualCost` (`ups-actual-cost.ts:403`) / `UpsActualAdjustmentForm.tsx:125` | **미적용** | `hkdTotal × exchangeRate` (`:447`) | 저장 없음 | **B와 동일 규칙**(A와 불일치) |
| **D. 클라이언트 표시** | `BillingConfirmModal.tsx:53` | `Math.round(baseFreightAmount * 1.07)` | — | 표시용 합계 | **같은 1.07이 클라이언트에도 중복**(계산 규칙 3중 구현) |

### 1-1. 기존 DB 행이 어느 경로로 저장됐는지 판별 가능한가

**로컬 DB 실측(2026-11-18)**:
```sql
SELECT count(*) FROM zen_ups_actual_cost;        -- 0
SELECT count(*) FROM zen_ups_actual_other_charges;-- 0
SELECT count(*) FROM zen_orders WHERE transport_mode='UPS'; -- 0
```
→ **로컬 DB에 판별할 행이 0건**이므로 "구분 가능"을 데이터로 실증할 수 없다. 스키마에도 **출처 컬럼·계산 버전이 없어 100% 판별은 구조적으로 불가능**하다.

**판별 휴리스틱(설계 제안, 운영 DB 읽기 전용 dry-run으로 검증 필요)**
| 조건 | 판정 |
|:--|:--|
| `base_freight_currency <> 'HKD'` | **A(finalize)** — A만 통화를 바꿔 저장한다 |
| `applied_exchange_rate IS NULL` 또는 `total_cost_krw IS NULL` | **판별 불가(UNKNOWN)** |
| `|total_cost_krw − round((base+fuel+surge+other) × rate, 2)| ≤ tol` (rate≠1) | **B(record_ups)** — 원화환산 합계 |
| `|total_cost_krw − (base+fuel+surge+other)| ≤ tol` | **A(finalize)** — 저장값 자체가 KRW 합계 |
| 그 외 | **UNKNOWN** |

- `tol = greatest(1, 0.005 × 기준값)` 권장(반올림 오차 흡수).
- A가 `baseFreightCurrency='HKD'`로 입력된 경우에도 저장값은 KRW이므로 `|total−S|`로 판별된다(B는 `rate≈1`이 아닌 한 성립 불가).
- **UNKNOWN 처리**: 원본(`raw`) 복원을 포기하고 `calc_version`/`surcharge_rate`를 NULL로 두어 "레거시·판별불가"로 표시, `total_cost_krw`만 신뢰(백필 대상 제외).

> 운영 DB dry-run SQL(설계 산출물, **실행은 DBA/Aiden 승인 후**):
> ```sql
> WITH s AS (
>   SELECT id, order_id, base_freight_currency AS cur, applied_exchange_rate AS r,
>          (base_freight_hkd+fuel_surcharge_hkd+surge_fee_hkd+other_charges_hkd) AS sum4,
>          total_cost_krw AS total
>   FROM zen_ups_actual_cost)
> SELECT CASE
>   WHEN cur <> 'HKD' THEN 'FINALIZE'
>   WHEN r IS NULL OR total IS NULL THEN 'UNKNOWN'
>   WHEN abs(total - round(sum4*r,2)) <= greatest(1, 0.005*abs(round(sum4*r,2))) AND r <> 1 THEN 'RECORD_HKD'
>   WHEN abs(total - sum4) <= greatest(1, 0.005*abs(sum4)) THEN 'FINALIZE'
>   ELSE 'UNKNOWN' END AS path_guess,
>   count(*)
> FROM s GROUP BY 1 ORDER BY 1;
> ```

## 2. 원가 계산 통합 설계

### 2-1. 순수 함수 시그니처 (제안)

```ts
// 위치(제안): src/lib/ups/actual-cost.ts  (pricing-engine은 "판매/추정" 계산이므로 분리)
export interface UpsActualCostAmounts {
  baseFreight: number;      // UPS 청구서 원금액(기본운임)
  fuelSurcharge: number;    // 원금액
  surgeFee: number;         // 원금액
  otherCharges: number;     // 원금액(자식 테이블 합계와 동일 기준)
  currency: string;         // 원금액 통화(현행 UI 기본 'HKD', KRW/USD 허용)
}
export interface UpsActualCostRates {
  exchangeRate: number;                 // 원금액 통화 → KRW (출고확정일)
  surchargeRate?: number;               // default: UPS_COST_SURCHARGE_RATE (0.07)
}
export interface UpsActualCostComputed {
  baseFreightRaw: number; currency: string;
  surchargeRate: number; surchargeAmountKrw: number;
  baseFreightKrw: number; fuelSurchargeKrw: number; surgeFeeKrw: number; otherChargesKrw: number;
  totalCostKrw: number; exchangeRate: number;
}
export function computeUpsActualCostKrw(
  amounts: UpsActualCostAmounts,
  rates: UpsActualCostRates,
): UpsActualCostComputed;
```

**계산 규칙(확정 반영)**
1. `baseFreightKrw = round(baseFreight × exchangeRate × (1 + surchargeRate))` — **가산은 기본운임에만**.
2. `fuel/surge/other = round(금액 × exchangeRate)` — 가산 없음.
3. `surchargeAmountKrw = round(baseFreight × exchangeRate × surchargeRate)` (표시·대사용, `total`과 합 일치하도록 반올림 순서 고정).
4. `totalCostKrw = baseFreightKrw + fuelKrw + surgeKrw + otherKrw`.
5. `currency === 'KRW'`이면 `exchangeRate = 1`(호출부가 보장) — **KRW 입력에 HKD 환율을 저장하던 현행 A 경로의 의미 오류를 제거**.
6. 반올림은 항목별 `Math.round`(현행 유지). 가산율은 **상수 1곳**만 참조, `1.07` 리터럴 금지(클라이언트 포함).

### 2-2. 3개 함수 적용안

| 함수 | 변경 |
|:--|:--|
| `recordUpsActualCost` | 입력(HKD) → `amounts`+`rates` → 계산 → 저장(원금액 컬럼 + KRW). 응답 `hkdTotal`·`totalCostKrw`는 계산 결과에서 |
| `previewUpsActualCost` | 동일 함수 호출(저장 없음) → **A와 B/C가 같은 숫자** |
| `recordActualCostAndFinalize` | 입력(기본운임 통화 + KRW 부가) → `amounts`(통화 정규화)로 변환 후 동일 함수. 기존 반환 필드 유지 |
| `BillingConfirmModal` | 클라이언트 `×1.07` 제거 → 서버 `preview` 응답(또는 서버가 내려주는 계산 상수) 사용 |

**테스트 설계 (두 경로 동일 결과 고정)**
- (T1) 동일 UPS 청구서 값(기본 1,000 HKD·유류 300·급증 50·기타 100, rate 188.42)을 경로 A·B로 각각 호출 → `base_freight_raw`, `surcharge_amount_krw`, `total_cost_krw`가 **`toEqual`로 동일**.
- (T2) 경로 C(preview) == B의 계산값.
- (T3) `currency='KRW'` 입력 시 `exchangeRate=1`, 가산 후 base만 7% 증가.
- (T4) **되돌리기 검증 지점**: `computeUpsActualCostKrw`의 `(1+surchargeRate)`를 1로 되돌리면 T1/T3 FAIL → 복구.
- (T5) 클라이언트 1.07 제거 검증: `BillingConfirmModal` 렌더 값이 preview 응답과 동일.

## 3. 스키마 안

### 3-1. 오더정산 상태 — **최종안 컬럼명 (후속 Task ②가 그대로 사용)**

| 테이블 | 컬럼 | 타입/제약 | 기본값 | 비고 |
|:--|:--|:--|:--|:--|
| `zen_orders` | `cost_settlement_status` | `text NOT NULL CHECK (IN ('NOT_SETTLED','SETTLED'))` | `'NOT_SETTLED'` | 오더정산 완료 여부 |
| `zen_orders` | `cost_settled_at` | `timestamptz NULL` | — | 정산 완료 시각 |
| `zen_orders` | `cost_settled_by` | `uuid NULL REFERENCES zen_profiles(id) ON DELETE SET NULL` | — | 처리자 |
| 인덱스 | `idx_zen_orders_cost_settlement` | `(cost_settlement_status, transport_mode) WHERE transport_mode='UPS'` | — | 청구서 후보 조회 |
| 제약(선택) | CHECK | `cost_settlement_status='SETTLED'` ⇒ `cost_settled_at IS NOT NULL AND cost_settled_by IS NOT NULL` | — | 상태-메타 정합 |

- 값 집합은 **정확히 `NOT_SETTLED` / `SETTLED` 두 개**(확장 여지: 후속에서 `EXCLUDED` 필요 시 별도 마이그레이션).
- 기존 오더는 DEFAULT로 `NOT_SETTLED`; **청구서에 포함된 오더는 되돌리기 거부**는 후속 `zen_billing_statement_items`의 UNIQUE/조회로 판정(이번 Task는 "확인 지점"만: `unmarkOrderCostSettled` 내부에서 `billing_statement_items WHERE order_id AND tier` 존재 확인 — 테이블은 Task ②에서 생성).

### 3-2. `zen_ups_actual_cost` — 원금액(raw)·가산율 스냅샷 + 의미 혼재 정리

**신규 컬럼(최종안)**
| 컬럼 | 타입/제약 | 기본값 | 의미 |
|:--|:--|:--|:--|
| `base_freight_raw` | `numeric(14,2) NULL` | — | UPS 청구서 기본운임 **원금액** |
| `base_freight_raw_currency` | `text NOT NULL` | `'HKD'` | 원금액 통화 |
| `cost_surcharge_rate` | `numeric(6,4) NULL` | — | 적용 가산율 스냅샷(0.07) |
| `cost_surcharge_amount_krw` | `numeric(14,2) NULL` | — | 가산액(KRW) |
| `calc_version` | `smallint NOT NULL` | `1`(레거시) / 신규 write `2` | 계산 규칙 버전(백필·감사) |

**의미 혼재(`*_hkd`) 정리 대안 비교**

| 안 | 내용 | 장점 | 단점·리스크 |
|:--|:--|:--|:--|
| **A. 신규 raw/스냅샷 컬럼 + 기존 `*_hkd` 의미 고정(백필)** | `*_hkd`=원금액(통화는 `base_freight_currency`), 신규 컬럼에 원금액·가산율, KRW는 `*_krw` 신설 없이 `total_cost_krw`+`cost_surcharge_amount_krw`로 계산 | 대사·감사 요건 충족, 단일 의미 | 기존 행 백필 필요(판별 불가 행은 NULL), UI 라벨 정리 동반 |
| B. 컬럼 리네임(`*_hkd`→`*_raw`) | 이름 정합 | 의미 명확 | 파괴적 변경(뷰·코드·문서 다수), 레거시 유지(Q4)와 충돌 |
| C. v2 테이블 신설(`zen_ups_actual_cost_v2`) | 기존 무변경 | 롤백 쉬움 | 이중 모델·조회 분기·조인 복잡, 청구서 연계 중복 |
| D. 컬럼 정리 없이 계산만 통합 | 변경 최소 | 리스크 최소 | 대사에 raw 필요(An_17 요구) 미충족, 의미 혼재 지속 |

**추천: A** — 다만 **백필은 2단계**로:
1. 마이그레이션 릴리즈: 컬럼 추가만(신규 write `calc_version=2`). 기존 행은 NULL 유지 → 서비스 영향 0.
2. 백필 배치(별도): §1-1 휴리스틱으로 `RECORD_HKD`/`FINALIZE` 판정 → raw·rate·surcharge 채움. `UNKNOWN`은 NULL 유지(`calc_version=1`).
- `*_hkd`의 **신규 write 의미**: 원금액(입력 통화) 저장으로 고정. 기존 UI(`UpsActualAdjustmentForm`가 `base_freight_hkd` 표시)는 "원금액(통화 라벨)"으로 라벨 변경 필요(구현 Task에서 `base_freight_raw_currency` 사용).
- **롤백**: 신규 컬럼 DROP(데이터 손실은 신규 필드뿐), `calc_version=2` write 중단. 기존 `total_cost_krw`는 불변이므로 원가 조회(주 사용처) 영향 없음.

## 4. 서버 액션 안 (Ds-11 최소 항목 형식)

공통: `use server`, `ups-actual-cost.ts` 확장, 실패 시 `logger.error/warn` + `trError('Errors 키')`. 권한 `assertAdmin`(현행 함수 재사용).

| 함수 | 권한 | 입력 | 출력 | 오류(키·조건) |
|:--|:--|:--|:--|:--|
| `getOrdersForCostSettlement(filter)` | Admin | `{status: 'NOT_SETTLED'\|'SETTLED'\|'ALL', from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', q?: string}` | `{orders: Array<{orderId, orderNo, shipperName, agencyName, deliveredAt, settlementStatus, settledAt, upsInvoiceNo?, hasRawCost: boolean}>, total}` | `permission_denied`; `generic{DATE_RANGE_INVALID}`(from>to) |
| `markOrderCostSettled(orderId)` | Admin | `orderId` | `{success: true, settledAt}` | `order_not_found` / `not_ups_order` / `ups_actual_cost_status_invalid`(DELIVERED 아님) / **`cost_not_entered`**(`zen_ups_actual_cost` 없음) / `already_settled` |
| `unmarkOrderCostSettled(orderId)` | Admin | `orderId` | `{success: true}` | `order_not_found` / `not_found`(NOT_SETTLED 아님) / **`statement_includes_order`**(청구서 포함) |

- **신규 `Errors` 키(안)**: `cost_not_entered`("실제 원가를 먼저 입력해야 합니다."), `already_settled`("이미 오더정산이 완료되었습니다."), `statement_includes_order`("청구서에 포함된 오더는 되돌릴 수 없습니다.") — 4개 로케일 동일 세트(구현 Task에서 추가).
- 전이: `NOT_SETTLED → SETTLED`는 원가 존재 + `status='DELIVERED'` + `transport_mode='UPS'` 검증. 되돌리기는 청구서 미포함만.
- 동시성: `UPDATE zen_orders SET ... WHERE id=$1 AND cost_settlement_status='NOT_SETTLED'`(조건부 갱신) 후 `rowCount=0`이면 `already_settled` — 낙관적 동시성.
- 후속 Task ②의 FK/조건: `billing_statement_items.order_id` → `zen_orders.id`, 후보 조건은 `cost_settlement_status='SETTLED'`(이 이름 그대로).

## 5. 영향도

| 대상 | 호출처/참조 (grep 전수) | 영향 |
|:--|:--|:--|
| `recordUpsActualCost` | `UpsActualAdjustmentForm.tsx:143`, `tests/unit/finance/ups-actual-cost.test.ts`, `task-b352-error-locale.test.ts` | 계산 규칙 변경(+7% 적용) — 화면 금액 변화, 테스트 기대값 갱신 |
| `recordActualCostAndFinalize` | `BillingConfirmModal.tsx:98`, `ups-actual-cost.test.ts` | 내부는 계산 함수로 위임, 반환 계약 유지 |
| `previewUpsActualCost` | `UpsActualAdjustmentForm.tsx:125` | A와 동일 규칙으로 변경 |
| `getUpsActualCost` | `UpsActualAdjustmentForm.tsx:79`, `ups-actual-cost.test.ts`, `task-b352-error-locale.test.ts` | 반환 스키마 확장(raw/rate) — 기존 필드 유지 |
| `zen_ups_actual_cost` 읽기 | `order-revenue-cost.ts:63,97,169,252,350,377`(`total_cost_krw`) | **불변**(통합 후에도 total 계산식만 변경) |
| `recomputeRevenue` (`ups-actual-cost.ts:94`) | record/preview 내부 | **경로 불변** — 중량/치수 기반 매출 재계산으로 원가 가산과 무관(통합 후에도 동일 호출) |
| `UPS_COST_SURCHARGE_RATE` | `pricing-engine.ts:22` 정의, 241·319·334·344·362 사용(추정 계산) | 통합 함수도 이 상수만 참조(중복 정의 금지) |

- **R-20**: GitNexus 도구·인덱스 미제공 → **불가**. 위 grep·직접 읽기로 대체.
- 테스트 영향(실측): `grep -rln "recordUpsActualCost\|recordActualCostAndFinalize\|zen_ups_actual_cost" tests` → **3파일**(`ups-actual-cost.test.ts`, `order-revenue-cost.test.ts`, `task-b352-error-locale.test.ts`).

## 6. 충돌 점검 (#1356 DEF-150)

- #1356은 **같은 파일**(`ups-actual-cost.ts`·`ups-actual-charges.ts`·`settlement.ts`)의 **권한 가드·대리점 필터**를 수정한다.
- 본 Task 설계 범위와 겹치는 지점: `assertAdmin`/`recordUpsActualCost`/`recordActualCostAndFinalize`의 권한·오류 반환.
- **권장 순서**: **#1356(구현) → TASK-B-358 구현(계산 통합)**. 이유: #1356이 가드/필터를 먼저 고정하면 계산 통합 PR이 권한 로직을 건드리지 않아 충돌·리뷰 부담이 줄어든다. 설계(본 단계)는 #1356과 독립.
- 만약 역순으로 진행해야 한다면, 계산 통합 PR에서 `assertAdmin` 호출부를 변경하지 말고 그대로 두는 조건을 DoD에 추가.

## 7. 구현 분할안

| PR | 범위 | 예상 | 비고 |
|:--|:--|--:|:--|
| **PR-1** | `computeUpsActualCostKrw` 신규 + `recordUpsActualCost`·`preview`·`recordActualCostAndFinalize` 적용 + 클라이언트 `1.07` 제거 + 테스트(T1~T5) | 0.5~1 MD | **스키마 변경 없음**, 기존 테스트 3파일 갱신 |
| **PR-2** | 마이그레이션: `zen_orders` 정산 컬럼 + `zen_ups_actual_cost` raw/스냅샷 컬럼 + 인덱스 + `calc_version` (컬럼 추가만) + R-08-2/자기완결 fixture | 0.3 MD | 백필은 별도(운영 dry-run 후) |
| **PR-3** | 서버 액션 `getOrdersForCostSettlement`·`markOrderCostSettled`·`unmarkOrderCostSettled` + 신규 `Errors` 3키 + Ds-11 반영 + 테스트 | 0.5~1 MD | 청구서 포함 확인은 Task ② 테이블 존재 전까지 TODO(함수 분리) |
| **PR-4(별도 Task)** | 오더정산 화면 S1/S2 + i18n | 별도 | An_17 §6 |

- **마이그레이션 R-08-2**: 로컬 `supabase db reset` + `seed-local` 후, 자기완결 fixture(신규 테이블/컬럼) 기반 통합 테스트. 기존 UPS 오더 원가 데이터가 없는 로컬 환경에서는 백필 검증을 **fixture 주입**(가짜 행 3종: RECORD_HKD/FINALIZE/UNKNOWN)으로 수행.
- **백필 검증**: §1-1 dry-run 결과와 실제 백필 결과 카운트 일치, UNKNOWN 행 수 보존 확인.

## 8. [설계 의견] — 결정 필요 사항 (Jaison/JSJung)

| # | 질문 | 권장안 |
|:--|:--|:--|
| Q-A | `computeUpsActualCostKrw`의 통화 모델: **원금액 통화 1개(기본운임 기준)** vs 항목별 통화 | **원금액 통화 1개** + `base_freight_raw_currency` 저장(현행 UI 흐름과 일치, 향후 항목별 확장 여지) |
| Q-B | 경로 A의 `applied_exchange_rate`가 KRW 입력에서도 HKD 환율을 저장하는 의미 오류 | **통합 시 `exchangeRate=1`(KRW)로 정정**, 기존 행은 백필에서 `currency='KRW'`면 동일하게 기록 |
| Q-C | 레거시 행 중 **UNKNOWN**(판별 불가) 처리 | `calc_version=1`·신규 컬럼 NULL 유지, `total_cost_krw`만 신뢰. **재계산·덮어쓰기 금지** |
| Q-D | `recordActualCostAndFinalize`(per-order 인보이스 마감)의 향후 역할 | Q4 확정대로 **레거시 UPS 오더 전용 유지**; 신규 청구서 흐름에서는 호출하지 않음(전환 규칙은 Task ③) |
| Q-E | 신규 `Errors` 3키 명칭 | `cost_not_entered`·`already_settled`·`statement_includes_order` (An_17 §5-1 오류 표와 정합) |
| Q-F | `zen_orders` 정산 상태 CHECK 제약에 `EXCLUDED`(정산 제외) 필요 여부 | **이번엔 2값만**. 필요 시 후속 마이그레이션 |

## 9. 검증 (설계 단계 DoD)

- [x] 산출물 1: 현행 조사표(파일:줄) — §1 (DB 판별 실측: 로컬 0행 → 불가 사실 + 휴리스틱/dry-run SQL)
- [x] 산출물 2: 통합 함수 시그니처·3함수 적용·동일결과 테스트 설계·되돌리기 지점 — §2
- [x] 산출물 3: 스키마 안(정산 상태 최종 컬럼명·값·기본값 + raw/스냅샷 + 의미 혼재 대안 4개·추천·백필/롤백) — §3
- [x] 산출물 4: 서버 액션 안(입출력·오류·권한·동시성) — §4
- [x] 산출물 5: 영향도 grep 전수 + `recomputeRevenue` 불변 + GitNexus 불가 — §5
- [x] 산출물 6: #1356 충돌·구현 순서 제안 — §6
- [x] 산출물 7: PR 분할·예상 공수·R-08-2/fixture·영향 테스트 실측 — §7
- [x] **코드·`messages/`·마이그레이션 변경 0건** — `git diff --stat | grep -E "^ (src|messages|supabase|tests)/"` 비어 있음
- [x] `check-R17-DoD`: 명령 미설치 → 설계 단계 DoD 수동 대조

## 10. [작업 결과]

- 코드 커밋: **없음**(설계 단계)
- 문서 커밋: 본 task file 1건 `[Dave] docs: TASK-B-358 설계 의견 — task file`
- PR: `Refs #1363` (설계 단계 — `Closes` 금지), 라벨 `status:draft`
- 선행: develop 동기화 PR **#1372**(TeamB_Dev) — 머지 후 본 PR은 새 base로 rebase 예정

## 11. [발견 이슈]

1. **[구조] 계산 규칙 3중 구현** — 서버 A(1.07)·서버 B/C(가산 없음)·클라이언트(1.07)로 같은 오더가 경로별로 다른 원가를 갖는다. 본 설계의 통합 함수로 해소 예정.
2. **[데이터] 로컬 DB에 판별 대상 0행** — `zen_ups_actual_cost` 0행, UPS 오더 0건. 백필 판별은 운영 DB dry-run으로 확정해야 하며, 본 설계는 휴리스틱과 SQL만 제시(추정 실행 금지).
3. **[의미] `applied_exchange_rate`가 KRW 입력 시에도 HKD 환율** — 대사 시 오해 소지. 통합 시 정정 제안(Q-B).
4. **[문서] An_17 §7의 구현 순서**와 본 문서 §7이 정합(오더정산 → 청구서). #1356을 먼저 처리 권장(§6).
