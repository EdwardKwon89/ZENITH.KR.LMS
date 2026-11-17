# TASK-B-358 — Issue #1363: 오더정산 상태 + UPS 실제원가 계산 통합 [설계 의견]

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#1363](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1363) (에픽 #1364 / 설계서 `docs/02_Analysis/An_17_청구서관리_오더정산_청구서_설계.md`) |
| **담당(Worker)** | Dave (Team B) |
| **검증(Auditor)** | Jaison |
| **최종 승인** | JSJung |
| **생성일** | 2026-11-18 (보완 2026-11-18) |
| **단계** | **설계 의견만** — `src/`·`messages/`·`supabase/migrations/` 수정 금지 |
| **브랜치** | `feature/teamb-task-b358-iss1363-billing-cost-settlement-design` (base `origin/TeamB_Dev` @ `4ba3e8184`, #1372 동기화 반영) |
| **채번 확인** | 착수 직전 `find .agent/tasks -name "TASK-B-358*"` → **0건** 확인 |
| **보완 이력** | Jaison 검토(2026-11-18) ①항목별 통화 ②기타부가운임 목록 ③스키마 중복 ④판별 휴리스틱 + 정산 후 수정 차단·PDF 범위 반영 |

## 0. 착수 전 기준 측정 (실제 출력)

```bash
$ grep -n "1.07\|UPS_COST_SURCHARGE_RATE" src/app/actions/finance/ups-actual-cost.ts src/lib/ups/pricing-engine.ts
src/app/actions/finance/ups-actual-cost.ts:522:      baseFreightKrw = Math.round(baseFreightInput * 1.07); // KRW는 +7% 적용
src/app/actions/finance/ups-actual-cost.ts:526:      baseFreightKrw = Math.round(baseFreightInput * currencyExchangeRate * 1.07);
src/lib/ups/pricing-engine.ts:22:export const UPS_COST_SURCHARGE_RATE = 0.07;
src/lib/ups/pricing-engine.ts:241: costSurchargeRate: UPS_COST_SURCHARGE_RATE
src/lib/ups/pricing-engine.ts:319,334,344,362: baseCostPrice = … * (1 + UPS_COST_SURCHARGE_RATE)

$ grep -rn "recordUpsActualCost\|recordActualCostAndFinalize\|previewUpsActualCost" src --include='*.ts' --include='*.tsx' | grep -v "^src/app/actions/finance/ups-actual-cost.ts"
src/components/finance/BillingConfirmModal.tsx:6,98
src/components/orders/UpsActualAdjustmentForm.tsx:5,125,143

$ grep -rln "recordUpsActualCost\|recordActualCostAndFinalize\|zen_ups_actual_cost" tests | wc -l
3
```
- `Errors` 키 현황: **90키** (B-356까지).

## 1. 현행 조사표 (실측 — 파일:줄)

**기존 스키마의 통화 컬럼(중요)**: `supabase/migrations/20260817100000_task_b317_actual_cost_schema.sql:9~11` 이 이미 `base_freight_currency`·`fuel_surcharge_currency`·`surge_fee_currency`(항목별 통화, 기본 `HKD`)를 추가했다. 따라서 **통화 모델은 "항목별"이 현행 사실**이다.

| 경로 | 함수/호출부 | 가산(+7%) | 통화 처리 | 저장값 의미 | 근거 줄 |
|:--|:--|:--|:--|:--|:--|
| **A. 청구확정 모달** | `recordActualCostAndFinalize` (`ups-actual-cost.ts:472`) / `BillingConfirmModal.tsx:98` | **적용 — 기본운임만** | 기본운임: 선택 통화(기본 **KRW**), 유류·급증: **KRW 고정**, 기타: 항목별 통화 목록 | `base_freight_hkd`=**KRW 환산값**; `fuel/surge_hkd`=KRW; `other_charges_hkd`=기타 **KRW 합계**; 자식 `zen_ups_actual_other_charges`에 `{name, amount, currency}` 행 | `:518`(기본통화), `:522,526`(1.07), `:544~547`(저장), `:551`(rate), `:560~585`(자식) |
| **B. 오더 상세 원가 폼** | `recordUpsActualCost` (`ups-actual-cost.ts:156`) / `UpsActualAdjustmentForm.tsx:143` | **미적용** | 전 항목 **HKD 원값**, `*_currency`는 기본값 `HKD` 유지 | `*_hkd`=HKD 원값, `total_cost_krw`만 KRW, **자식 행 미사용** | `:214~217`(저장), `:231`(total) |
| **C. 미리보기** | `previewUpsActualCost` (`ups-actual-cost.ts:403`) / `UpsActualAdjustmentForm.tsx:125` | **미적용** | B와 동일(HKD) | 저장 없음 | `:444~447` |
| **D. 클라이언트 표시** | `BillingConfirmModal.tsx:58` | `Math.round(baseFreightAmount * 1.07)` | — | 표시용 합계(서버 미리보기와 별도 계산) | `:58` (Jaison 지적 반영: 53→58) |

- **계산 규칙 3중 구현**: 서버 A(1.07) / 서버 B·C(가산 없음) / 클라이언트 D(1.07).
- **의미 혼재**: `base_freight_hkd`에 A는 KRW, B는 HKD. `applied_exchange_rate`는 A에서 **기본운임 통화→KRW**를 담지만, 기본통화가 KRW여도 HKD 환율을 저장한다(`:551` 조건식) — 의미 오류(Q-B, 승인됨).

### 1-1. 기존 DB 행의 저장 경로 판별

**로컬 DB 실측(2026-11-18)**: `zen_ups_actual_cost` **0행**, `zen_ups_actual_other_charges` **0행**, UPS 오더 **0건** → **데이터로 실증 불가**. 스키마에 출처 컬럼이 없어 100% 판별은 불가하나, **A 경로가 남기는 강한 표지**가 있다.

| 우선순위 | 조건 | 판정 | 근거 |
|:--:|:--|:--|:--|
| **1** | `fuel_surcharge_currency='KRW' AND surge_fee_currency='KRW'` | **A** | A는 `:545~546`에서 두 컬럼을 `'KRW'`로 명시 저장. B는 값을 쓰지 않아 기본값 `HKD` 유지 → 기본운임을 HKD로 입력한 A도 잡힌다 |
| 2 | `zen_ups_actual_other_charges`에 해당 order_id 행 존재 | **A(보조)** | A만 자식 행을 쓴다(`:560~585`). 단 A도 기타부가운임이 없으면 행이 없으므로 **부재는 A가 아님을 뜻하지 않음** |
| 3 | `base_freight_currency <> 'HKD'` | **A** | B는 컬럼을 쓰지 않음 |
| 4 | `|total_cost_krw − round(Σ4 × rate, 2)| ≤ tol` (rate≠1) | **B** | B는 `Σ4(HKD) × rate` |
| 5 | `|total_cost_krw − Σ4| ≤ tol` | **A** | A는 저장값 자체가 KRW 합계 |
| — | 그 외/`rate`·`total` NULL | **UNKNOWN** | 원본 복원 포기 |

- `tol = greatest(1, 0.005 × 기준값)`.
- **UNKNOWN 정책(승인)**: 덮어쓰기·재계산 금지, `calc_version=1` 유지.

**운영 DB dry-run SQL (실행은 승인 후 DBA/Aiden)** — Jaison 지적 반영(1순위 통화 컬럼 표지):
```sql
WITH s AS (
  SELECT c.id, c.order_id,
         c.base_freight_currency   AS bcur,
         c.fuel_surcharge_currency AS fcur,
         c.surge_fee_currency      AS scur,
         c.applied_exchange_rate   AS r,
         (c.base_freight_hkd+c.fuel_surcharge_hkd+c.surge_fee_hkd+c.other_charges_hkd) AS sum4,
         c.total_cost_krw AS total,
         EXISTS (SELECT 1 FROM zen_ups_actual_other_charges o WHERE o.order_id=c.order_id) AS has_child
  FROM zen_ups_actual_cost c)
SELECT CASE
  WHEN fcur='KRW' AND scur='KRW' THEN 'A_FINALIZE'
  WHEN has_child THEN 'A_FINALIZE'
  WHEN bcur <> 'HKD' THEN 'A_FINALIZE'
  WHEN r IS NULL OR total IS NULL THEN 'UNKNOWN'
  WHEN r <> 1 AND abs(total - round(sum4*r,2)) <= greatest(1, 0.005*abs(round(sum4*r,2))) THEN 'B_RECORD_HKD'
  WHEN abs(total - sum4) <= greatest(1, 0.005*abs(sum4)) THEN 'A_FINALIZE'
  ELSE 'UNKNOWN' END AS path_guess,
  count(*)
FROM s GROUP BY 1 ORDER BY 1;
```

## 2. 원가 계산 통합 설계 (항목별 통화 반영 — 보완 ①·②)

### 2-1. 순수 함수 시그니처 (수정안)

```ts
// 위치(제안): src/lib/ups/actual-cost.ts  (pricing-engine은 "판매/추정" 계산이므로 분리)
export interface CurrencyAmount { amount: number; currency: string }        // 예: {amount: 1240, currency: 'HKD'}
export interface RawOtherCharge { name: string; amount: number; currency: string }

export interface UpsActualCostAmounts {
  baseFreight: CurrencyAmount;
  fuelSurcharge: CurrencyAmount;
  surgeFee: CurrencyAmount;
  otherCharges: RawOtherCharge[];      // 목록(행별 통화)
}
export interface UpsActualCostRates {
  exchangeRates: Record<string, number>; // 통화 → KRW (출고확정일). 예: {HKD:188.42, KRW:1, USD:1350}
  surchargeRate?: number;                // default: UPS_COST_SURCHARGE_RATE
}
export interface ComputedLine { raw: CurrencyAmount; exchangeRate: number; krw: number }
export interface UpsActualCostComputed {
  base: ComputedLine & { surchargeRate: number; surchargeAmountKrw: number };
  fuel: ComputedLine;
  surge: ComputedLine;
  otherCharges: Array<RawOtherCharge & { exchangeRate: number; krw: number }>;
  otherChargesKrwTotal: number;
  totalCostKrw: number;
  appliedExchangeRates: Record<string, number>; // 실제 사용된 통화만
}
export function computeUpsActualCostKrw(
  amounts: UpsActualCostAmounts,
  rates: UpsActualCostRates,
): UpsActualCostComputed;
```

**계산 규칙(확정 반영)**
1. 각 항목을 **자기 통화의 환율**로 KRW 환산: `krw = round(amount × exchangeRates[currency])`.
2. 가산은 **기본운임에만**: `base.krw = round(amount × rate × (1 + surchargeRate))`, `surchargeAmountKrw = round(amount × rate × surchargeRate)`(표시·대사용).
3. 유류·급증·기타는 가산 없이 항목별 환산 후 합산.
4. `totalCostKrw = base.krw + fuel.krw + surge.krw + otherChargesKrwTotal`.
5. 사용 통화의 환율이 `rates.exchangeRates`에 없으면 **throw**(`MISSING_RATE:<currency>`) → 호출부가 `generic` 코드로 변환. `KRW`는 `1` 필수.
6. 반올림은 항목별 `Math.round`(현행 유지). 가산율은 `UPS_COST_SURCHARGE_RATE` **한 곳**만 참조(`1.07` 리터럴 금지, 클라이언트 포함).

### 2-2. 함수 입력 ↔ 저장 컬럼 매핑표 (보완 요청 반영)

| 계산 입력 | `zen_ups_actual_cost` 컬럼 | `zen_ups_actual_other_charges` | 비고 |
|:--|:--|:--|:--|
| `baseFreight.amount` / `.currency` | `base_freight_hkd`(=**원금액**, 통화는 아래) / `base_freight_currency` | — | 컬럼명은 레거시(`_hkd`)나 의미를 원금액으로 고정 |
| `fuelSurcharge.amount` / `.currency` | `fuel_surcharge_hkd` / `fuel_surcharge_currency` | — | B317에서 이미 항목별 통화 |
| `surgeFee.amount` / `.currency` | `surge_fee_hkd` / `surge_fee_currency` | — | 동일 |
| `otherCharges[]` (name, amount, currency) | `other_charges_hkd` = **KRW 합계**(`otherChargesKrwTotal`) | 행별 `charge_name`, `amount`, `currency` | A 현행과 일치, B도 자식 행을 쓰도록 통일 |
| 계산 결과(가산율·가산액) | `cost_surcharge_rate`, `cost_surcharge_amount_krw` (신규) | — | 스냅샷 |
| 사용 환율 | `applied_exchange_rates`(신규 jsonb) + `applied_exchange_rate`(기본통화 rate, 레거시 호환) | — | §3-2 |
| 계산 버전 | `calc_version`(신규, 2) | — | — |
| 정산 상태 | — | — | `zen_orders.cost_settlement_status/at/by` |

### 2-3. 기타부가운임(목록) 처리 — 보완 ②

- **A 현행**: `input.otherCharges[]`를 `zen_ups_actual_other_charges`에 `{name, amount, currency||'KRW'}`로 저장, 메인 `other_charges_hkd`에는 **KRW 합계**를 저장(`:547`, `:560~585`).
- **B 현행**: `otherChargesHkd` 단일 합계만 저장, 자식 행 없음.
- **통합안**: 함수 입력은 **항상 목록**. B 입력은 `[{name:'기타부가운임', amount: otherChargesHkd, currency:'HKD'}]` 1행으로 정규화해 **자식 행을 쓰게 통일**한다(An_17 요구 "부가운임 항목별 그대로 전가" 충족). 메인 `other_charges_hkd`에는 KRW 합계를 저장한다.
  - B 화면의 다중 행 입력 확장은 **PR-4(화면)** 범위로 둔다(이번 설계는 서버 계약만).
  - 기존 자식 행이 없는 B 레거시 행은 §3-2 백필에서 1행을 생성해 정합화한다(할 수 없는 경우 UNKNOWN 처리).

### 2-4. 3개 함수 적용안

| 함수 | 변환 |
|:--|:--|
| `recordUpsActualCost` | 입력(HKD 4필드) → `amounts`(base/fuel/surge `HKD`, other 1행 `HKD`) + `rates={HKD: rate, KRW:1}` → 계산 → 저장 |
| `previewUpsActualCost` | 동일 `amounts`/`rates`로 계산만 → **A와 같은 결과**(B/C 통일) |
| `recordActualCostAndFinalize` | 입력(기본운임 통화 + KRW 부가 + 기타 목록) → `amounts`(base=fx, fuel/surge=`KRW`, other=목록) + `rates`(기본통화 rate + `KRW:1`) → 계산 → 저장 |
| `BillingConfirmModal.tsx:58` | 클라이언트 `×1.07` 제거 → 서버 preview 응답 사용 |

### 2-5. 테스트 설계 (두 경로 동일 결과 + 되돌리기)

| TC | 내용 | 기대 |
|:--|:--|:--|
| T1 | 동일 UPS 청구서(기본 1,000 HKD, 유류 300 HKD, 급증 50 HKD, 기타 [{100,HKD}], rates={HKD:188.42,KRW:1})를 A·B로 호출 | `base_freight_hkd`·`fuel/surge`·`other_charges_hkd`·`surcharge_amount_krw`·`total_cost_krw`가 **`toEqual` 동일** |
| T2 | C(preview) == B 계산값 | `toEqual` |
| T3 | KRW 기본운임 입력(A) | `exchangeRates.KRW=1`, 기본운임만 7% 가산, `applied_exchange_rate`는 **1** |
| T4 | 항목 통화 혼합(기본 USD 1,000·유류 HKD 300·기타 KRW 50,000) | 항목별 환산 합계 `toEqual` |
| T5 | 기타부가운임 목록 2행 | 자식 행 2행 저장 + 메인 = KRW 합계 |
| T6 | **되돌리기**: `(1+surchargeRate)`를 `1`로 원복 | T1·T3 FAIL → 복구 |
| T7 | 정산 완료 오더에 `recordUpsActualCost` | `cost_settled_locked` 거부(§4) |
| T8 | 클라이언트: `BillingConfirmModal` 표시 합계 == preview 응답 | `toBe` |

## 3. 스키마 안

### 3-1. 오더정산 상태 — **확정 컬럼명(Task ②가 그대로 사용)**

| 테이블 | 컬럼 | 타입/제약 | 기본값 |
|:--|:--|:--|:--|
| `zen_orders` | `cost_settlement_status` | `text NOT NULL CHECK (IN ('NOT_SETTLED','SETTLED'))` | `'NOT_SETTLED'` |
| `zen_orders` | `cost_settled_at` | `timestamptz NULL` | — |
| `zen_orders` | `cost_settled_by` | `uuid NULL REFERENCES zen_profiles(id) ON DELETE SET NULL` | — |
| 인덱스 | `idx_zen_orders_cost_settlement` | `(cost_settlement_status, transport_mode) WHERE transport_mode='UPS'` | — |
| CHECK(선택) | `cost_settlement_status='SETTLED'` ⇒ `cost_settled_at/by NOT NULL` | — | — |

- 값 집합은 정확히 2값(Q-F 승인). 기존 오더는 DEFAULT로 `NOT_SETTLED`.

### 3-2. `zen_ups_actual_cost` — **중복 제거 후 최소 신규 컬럼만** (보완 ③)

**재사용(기존)**: `base_freight_currency`·`fuel_surcharge_currency`·`surge_fee_currency`(B317), `applied_exchange_rate`, `total_cost_krw`, `*_hkd` 4컬럼, 자식 테이블 `zen_ups_actual_other_charges`.

**의미 고정(신규 컬럼 아님)**
- `base_freight_hkd` / `fuel_surcharge_hkd` / `surge_fee_hkd` = **원금액**(통화는 각 `*_currency`).
- `other_charges_hkd` = **기타부가운임 KRW 합계**(원금액·통화는 자식 행이 보관).
- `applied_exchange_rate` = **기본운임 통화→KRW 비율**(레거시 호환·표시용). KRW 입력이면 `1`로 정정(Q-B).

**신규 컬럼(최소)**

| 컬럼 | 타입 | 기본값 | 목적 |
|:--|:--|:--|:--|
| `cost_surcharge_rate` | `numeric(6,4) NULL` | — | 적용 가산율 스냅샷(0.07) |
| `cost_surcharge_amount_krw` | `numeric(14,2) NULL` | — | 가산액(KRW) |
| `calc_version` | `smallint NOT NULL` | `1`(레거시) / 신규 write `2` | 계산 규칙 버전 |
| `applied_exchange_rates` | `jsonb NULL` | — | 사용 통화별 rate 스냅샷 `{HKD:188.42, KRW:1}` |
| `cost_legacy_snapshot` | `jsonb NULL` | — | 백필 前 원본 4컬럼+rate (롤백 전용) |

- **`base_freight_raw`·`base_freight_raw_currency`는 추가하지 않는다** — `base_freight_hkd`+`base_freight_currency`가 이미 원금액·통화를 표현(중복). 컬럼명의 `_hkd`는 레거시 이름으로 주석(COMMENT)에 의미를 명시.

**항목별 환율 스냅샷 보관 — 대안 비교**

| 안 | 내용 | 장점 | 단점 |
|:--|:--|:--|:--|
| **(i) `applied_exchange_rates jsonb`** | 사용 통화→rate 맵 | 항목 추가에 유연, 단일 컬럼, 감사 가능 | SQL 조회 시 `->>` 사용 |
| (ii) 항목별 rate 컬럼(`fuel_exchange_rate` 등) | 컬럼 4~N개 | 정적 스키마·인덱스 | 항목 증가 시 마이그레이션, 기타 다통화 표현 불가 |
| (iii) 스냅샷 없이 `exchange_rates` 재조회 | 저장 안 함 | 컬럼 없음 | 과거 원가 재현 불가(환율 변경 시 값 변동) — **불가** |

**추천: (i)** — `applied_exchange_rate`는 기본통화 rate로 유지(기존 조회·표시 호환).

**백필 전략(2단계, UNKNOWN 보존)**
1. 마이그레이션: 컬럼 추가만(서비스 영향 0). 신규 write는 `calc_version=2` + `applied_exchange_rates` 기록.
2. 백필 배치(승인 후, §1-1 SQL로 판정):
   - `A_FINALIZE`: `cost_legacy_snapshot`에 원본 저장 → 원금액 복원(`raw = base_stored / (1+0.07) / rate_used`, `rate_used = currency==='KRW' ? 1 : applied_exchange_rate`) → `base_freight_hkd=raw`, `cost_surcharge_rate=0.07`, `cost_surcharge_amount_krw=base_stored−round(raw×rate_used)`, `applied_exchange_rates={currency:rate_used, KRW:1}`, `calc_version=2`. **`total_cost_krw`는 불변.**
   - `B_RECORD_HKD`: `base/fuel/surge`는 이미 원금액 → 유지. `other_charges_hkd`(HKD) → KRW 합계로 변환하고 자식 1행 생성(`기타부가운임`), `applied_exchange_rates={HKD:rate,KRW:1}`, `calc_version=2`.
   - `UNKNOWN`: **변경 없음**(`calc_version=1`, 신규 컬럼 NULL).
- **롤백**: `cost_legacy_snapshot`으로 기존 4컬럼+rate 복원 → 신규 컬럼 DROP. `total_cost_krw`는 모든 단계에서 불변이므로 원가 조회(`order-revenue-cost`) 영향 없음.
- 대안 비교(스키마 정리): **A. 의미 고정+신규 최소 컬럼(추천)** / B. 컬럼 리네임(파괴적) / C. v2 테이블(이중 모델) / D. 정리 없이 계산만(대사 불가). 상세 장단점은 초판 §3-2와 동일하며, 보완으로 **신규 컬럼 5개(위 표)로 축소**했다.

## 4. 서버 액션 안 (Ds-11 최소 항목 형식)

공통: `ups-actual-cost.ts` 확장, `assertAdmin`, 실패 시 `logger.error/warn` + `trError('Errors 키')`.

| 함수 | 권한 | 입력 | 출력 | 오류(키·조건) |
|:--|:--|:--|:--|:--|
| `getOrdersForCostSettlement(filter)` | Admin | `{status, from, to, q?}` | `{orders, total}` (오더번호·배송완료일·정산상태·UPS청구서번호) | `permission_denied`; `generic{DATE_RANGE_INVALID}` |
| `markOrderCostSettled(orderId)` | Admin | `orderId` | `{success, settledAt}` | `order_not_found` / `not_ups_order` / `ups_actual_cost_status_invalid`(DELIVERED 아님) / **`cost_not_entered`** / **`already_settled`** |
| `unmarkOrderCostSettled(orderId)` | Admin | `orderId` | `{success}` | `order_not_found` / `not_found`(NOT_SETTLED 아님) / **`statement_includes_order`** |
| **정산 후 수정 가드**(신규 규칙) | Admin | — | — | **`cost_settled_locked`** — `cost_settlement_status='SETTLED'`이면 원가·중량 수정 거부 |

**정산 후 수정 차단 규칙(필수 추가)**
- 대상: `recordUpsActualCost`, `recordActualCostAndFinalize`. 주문 조회 직후 `cost_settlement_status='SETTLED'`이면 `{success:false, error: await trError('cost_settled_locked')}` + `logger.warn`.
- `previewUpsActualCost`는 저장이 없으므로 허용(미리보기만).
- `recomputeRevenue`는 위 두 함수에서만 호출되므로 **상위 가드로 충분**(별도 가드 불필요) — 호출 경로 grep 결과 2곳뿐.
- `updateOrder`(중량/치수 수정)도 정산 후에는 같은 금액 왜곡을 일으킬 수 있다 → **Task ②에서 동일 규칙 적용 권장**(공유 파일 `orders.ts`라 이번 Task 범위 밖, Q-G).
- `unmarkOrderCostSettled`의 청구서 포함 확인은 `zen_billing_statement_items` 생성(Task ②) 후 활성화. 그 전까지는 `cost_settlement_status`만 되돌리되, **TODO 주석 + 테스트 skip**으로 표시(구현 Task에서 교체).
- 신규 `Errors` 키 4개(안): `cost_not_entered`·`already_settled`·`statement_includes_order`·`cost_settled_locked` (4개 로케일 동일 세트).

**동시성**: 조건부 UPDATE(`WHERE id=$1 AND cost_settlement_status='NOT_SETTLED'`) 후 `rowCount=0` → `already_settled`.

## 5. 영향도

| 대상 | 호출처/참조 (grep 전수) | 영향 |
|:--|:--|:--|
| `recordUpsActualCost` | `UpsActualAdjustmentForm.tsx:143`, `ups-actual-cost.test.ts`, `task-b352-error-locale.test.ts` | 계산 규칙 변경(+7% 적용), 기대값 갱신 |
| `recordActualCostAndFinalize` | `BillingConfirmModal.tsx:98`, `ups-actual-cost.test.ts` | 내부 위임, 반환 계약 유지 |
| `previewUpsActualCost` | `UpsActualAdjustmentForm.tsx:125` | A와 동일 규칙 |
| `getUpsActualCost` | `UpsActualAdjustmentForm.tsx:79`, 테스트 2파일 | 반환 필드 확장(기존 유지) |
| `zen_ups_actual_cost` 읽기 | `order-revenue-cost.ts:63,97,169,252,350,377` | **불변**(`total_cost_krw`만 사용) |
| `recomputeRevenue` (`ups-actual-cost.ts:94`) | record/preview 내부 2곳 | **경로 불변**(중량·치수 기반 매출 재계산) |
| `UPS_COST_SURCHARGE_RATE` | `pricing-engine.ts:22` 정의, 241·319·334·344·362 | 통합 함수도 이 상수만 참조 |

- **R-20**: GitNexus 도구·인덱스 미제공 → **불가**, grep·직접 읽기 대체.
- 테스트 영향: **3파일**(`ups-actual-cost.test.ts`, `order-revenue-cost.test.ts`, `task-b352-error-locale.test.ts`).

## 6. 충돌 점검 (#1356 DEF-150)

- #1356은 같은 파일(`ups-actual-cost.ts`·`ups-actual-charges.ts`·`settlement.ts`)의 권한 가드·대리점 필터를 수정한다.
- 겹치는 지점: `assertAdmin`, `recordUpsActualCost`/`recordActualCostAndFinalize` 권한·오류 반환.
- **권장 순서: #1356(구현) → TASK-B-358 구현(계산 통합)**. 설계(본 단계)는 독립.
- 역순 진행 시: 계산 통합 PR에서 `assertAdmin` 호출부를 변경하지 않는다는 조건을 DoD에 추가.

## 7. 구현 분할안

| PR | 범위 | 예상 | 비고 |
|:--|:--|--:|:--|
| **PR-1** | `computeUpsActualCostKrw`(항목별 통화·기타 목록) + 3함수 적용 + 클라이언트 `1.07` 제거 + T1~T6, T8 | 0.8~1.2 MD | **스키마 변경 없음**, 테스트 3파일 갱신 |
| **PR-2** | 마이그레이션(정산 컬럼 + 신규 5컬럼 + 인덱스) + `cost_legacy_snapshot` + 백필 배치(승인 후) + R-08-2/fixture | 0.4 MD | 컬럼 추가 릴리즈와 백필 2단계 분리 |
| **PR-3** | 서버 액션 3종 + `cost_settled_locked` 가드 + `Errors` 4키 + Ds-11 반영 + T7 | 0.5~1 MD | 청구서 포함 확인은 Task ② 후 활성 |
| **PR-4(별도 Task)** | 화면 S1/S2 + **UPS 청구서 PDF 첨부**(An_17 Q8) + 기타부가운임 다중행 UI + i18n | 별도 | PDF 첨부는 이번 스키마에 넣지 않고 화면 Task로 명시 |

- **R-08-2/fixture**: 로컬 `supabase db reset` + seed 후 fixture 3종(A/B/UNKNOWN) 주입 → 백필 스크립트 검증(카운트·UNKNOWN 보존·`total_cost_krw` 불변).
- **백필 검증**: dry-run 판정 수 == 백필 처리 수 + UNKNOWN 수 보존, `cost_legacy_snapshot` 존재 확인.

## 8. [설계 의견] — Jaison 판정 반영 및 추가 확인

| # | 내용 | 상태 |
|:--|:--|:--|
| Q-A | 항목별 통화 모델 | **반려 반영** — §2-1 시그니처(항목별 `CurrencyAmount` + `exchangeRates` 맵), §1-1 1순위 표지, §3-2 기존 `*_currency` 재사용 |
| Q-B | KRW 입력 시 `applied_exchange_rate=1` | 승인 — §2-1 규칙 5, §3-2 의미 고정 |
| Q-C | UNKNOWN 재계산 금지 | 승인 — §1-1·§3-2 백필 |
| Q-D | `recordActualCostAndFinalize` 레거시 유지 | 승인 |
| Q-E | 신규 키 명칭 | 승인(3키) + **`cost_settled_locked` 1키 추가 제안** |
| Q-F | 정산 상태 2값 | 승인 |
| **Q-G** | `updateOrder` 중량/치수 수정도 정산 후 차단할지 | **권장: 차단**(Task ②, `orders.ts` 공유 파일) — 이번 Task 범위 밖 |

## 9. 검증 (설계 단계 DoD)

- [x] 산출물 1: 현행 조사표(파일:줄) — §1 (클라이언트 `1.07` = `BillingConfirmModal.tsx:58`로 정정)
- [x] `zen_ups_actual_cost` 판별: 로컬 0행 실증 불가 + **1순위 통화 컬럼 표지** 휴리스틱 + dry-run SQL — §1-1
- [x] 산출물 2: **항목별 통화** 시그니처·매핑표·기타부가운임 목록·3함수 적용·T1~T8·되돌리기 — §2
- [x] 산출물 3: **중복 컬럼 제거**(기존 `*_currency` 재사용, raw 컬럼 미추가) + 신규 5컬럼 + 환율 스냅샷 대안 비교·추천 + 백필/롤백(스냅샷) — §3-2
- [x] 산출물 4: 서버 액션 3종 + **정산 후 수정 차단 규칙(가드 위치·오류 키)** — §4
- [x] 산출물 5: 영향도 grep 전수 + `recomputeRevenue` 불변 + GitNexus 불가 — §5
- [x] 산출물 6: #1356 충돌·순서 — §6
- [x] 산출물 7: PR 분할·PDF 첨부 범위(PR-4)·R-08-2/fixture·영향 3파일 — §7
- [x] **코드·`messages/`·마이그레이션 변경 0건** — `git diff --name-only origin/TeamB_Dev...HEAD` = task file 1개
- [x] `check-R17-DoD`: 명령 미설치 → 수동 대조(설계 단계)

## 10. [작업 결과]

- 코드 커밋: **없음**(설계 단계)
- 문서 커밋(초판): `826faf33e` / **보완 커밋**: (push 후 기재)
- PR: #1373 (`Refs #1363`, 라벨 `status:draft` 유지)
- base: `origin/TeamB_Dev` @ `4ba3e8184` (#1372 동기화 머지 반영, rebase 완료)

## 11. [발견 이슈]

1. **[구조] 계산 규칙 3중 구현**(서버 A 1.07 / 서버 B·C 미적용 / 클라이언트 1.07) — 통합 함수로 해소.
2. **[데이터] 로컬 판별 대상 0행** — 운영 DB dry-run으로만 확정 가능. 본 설계는 휴리스틱·SQL·UNKNOWN 정책 제시.
3. **[의미] `applied_exchange_rate`가 KRW 입력에서도 HKD 환율** — 통합 시 `1` 정정 + `applied_exchange_rates` jsonb로 항목별 스냅샷.
4. **[스키마] B317 `*_currency` 3컬럼이 이미 존재** — 초판의 `base_freight_raw_currency`는 중복이었음(보완에서 제거). `other_charges_hkd`는 KRW 합계로 의미 고정하고 원금액은 자식 행에 보존.
5. **[범위] UPS 청구서 PDF 첨부(An_17 Q8)** — 이번 스키마에 미포함, **PR-4(화면) 범위**로 명시.
