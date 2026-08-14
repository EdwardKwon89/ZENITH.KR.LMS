# TASK-B-302 — UPS 운임 계산 전체 "올림(Ceiling)" 정책 적용 (표출 + 저장값)

| 항목 | 내용 |
|:-----|:------|
| **생성일** | 2026-08-14 |
| **담당** | Dave (구현) · Jaison (검토) |
| **우선순위** | P1 (금액 산정 로직 — 실 청구/정산에 영향) |
| **GitHub Issue** | [#1123](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1123) |
| **관련 결함** | 없음(JSJung 정책 지시) |
| **상태** | 🔔 (완료 보고 — 검토 요청) |

## 배경 (JSJung 확정 정책)

"UPS 모든 운임 표출은 올림으로 표출합니다" 지시에 따른 Jaison 사전 조사·설계. 확정된 정책 3가지:
1. **올림 단위**: KRW는 원 단위(정수) 올림, USD는 소수점 2자리(센트) 단위 올림
2. **적용 범위**: 화면 표시(표출)뿐 아니라 **저장값 자체**(계산 로직)를 올림값으로 변경
3. **기존 데이터**: 이미 생성된 오더의 저장된 스냅샷은 소급 보정하지 않음 — **이 작업 이후 신규로 계산되는 값부터만** 적용(과거 청구/정산 이력과 충돌 방지)

## 조사 결과 — UPS 운임 계산의 단일 진입점 구조 확인

`gitnexus`/grep으로 호출 관계를 추적한 결과, UPS 셀링 금액을 계산하는 코드 경로가 다음과 같이 **단일 흐름**으로 정리되어 있음을 확인(생각보다 blast radius가 좁음):

```
pricing-engine.ts :: computeUpsFreight()  ← 유일한 실호출자
        ↓ (freight.ts :: estimateUpsFreight() 내부에서)
agency-pricing.ts :: computeAgencyFreight()   (대리점 소속 화주인 경우)
shipper-pricing.ts :: computeShipperFreight() (화주 존재 시)
```

`estimateUpsFreight()`(`src/app/actions/ups/freight.ts`)는 아래 **3곳 모두**에서 재호출된다 — 즉 이 3개 파일만 정확히 고치면 표출 화면 4곳(등록 예상운임 패널·오더상세 운임카드·사후청구 정산조정·일일정산)에 **자동으로 전파**된다(각 화면이 개별적으로 재계산 로직을 갖고 있지 않음):
- 오더 등록/수정 시 예상운임 조회 (`OrderRegistrationForm` → `UpsFreightEstimatePanel`)
- 오더 생성 시 `zen_order_rate_snapshots` 저장 (`orders.ts::saveOrderRateSnapshot`) — `zen_orders.estimated_cost`도 동일 소스
- 배송완료 후 실측 기반 재계산 (`ups-actual-cost.ts::recomputeRevenue` — "실제 청구액" 화면의 소스)

**주의**: 표출 화면 자체(`UpsOrderBreakdownCard.tsx` 등)는 이번 작업에서 로직을 건드리지 않는다 — 소스 데이터가 이미 올림값이 되므로 화면은 받은 값을 그대로 표시하면 된다(단, 아래 ④ 표시 포맷 정리는 예외).

## 작업 범위

### ① 공용 올림 유틸 신설 — `pricing-engine.ts`

```ts
// 통화별 올림 — KRW는 정수(원) 단위, 그 외(USD 등)는 소수점 2자리(센트) 단위
export function ceilByCurrency(amount: number, currency: string): number {
  if (currency === 'KRW') return Math.ceil(amount);
  return Math.ceil(amount * 100) / 100;
}
```

### ② `pricing-engine.ts :: computeUpsFreight()` — 플랫폼 단계 올림 적용

**중요 원칙**: 각 라인 항목(기본운임/유류할증/급증수수료/기타부가)을 **개별적으로 먼저 올림**한 뒤 합계를 계산한다(합계를 나중에 한 번만 올림하지 않음) — 화면에 표시되는 개별 항목들의 합이 항상 화면에 표시되는 합계와 정확히 일치해야 하기 때문(예: 기본운임+유류할증+급증수수료+기타 = 합계, 사용자가 직접 검산 가능해야 함).

1. `currency` 결정을 함수 앞부분으로 이동(현재 L369 — 함수 맨 끝에서만 결정됨 → 계산 도중 각 단계에서 쓸 수 있도록 최상단 근처로 이동)
2. `baseSellingPrice` 계산 완료 직후(4개 분기 — FREIGHT ≤70kg/초과, EXPRESS/SAVER ≤20kg/초과 — 각 분기 끝나고 공통되는 지점 1곳) `ceilByCurrency()` 적용
3. `fuelSellAmt = ceilByCurrency(baseSellingPrice * fuelRate, currency)` (L346, 이미 올림된 `baseSellingPrice` 사용)
4. `applyOtherCharges()` 내부(L171-192): 각 `charge`별 `base_s + fuel_s`를 올림 후 `items`에 담고, `sellingTotal`은 **이미 올림된 개별 항목들의 합**으로 계산(먼저 합산 후 올림 X). `costTotal`/`base_c`/`fuel_c`는 원가 항목이므로 이번 범위 밖 — 그대로 유지.
5. `applySurgeFee()` 내부(L241-258): `sellingAmount = ceilByCurrency(baseSelling + baseSelling * fuelRate, currency)` — `costAmount`는 원가라 범위 밖, 그대로 유지.
6. `totalSellingPrice`(L367)는 이미 올림된 4개 항목의 단순 합(추가 올림 불필요 — KRW는 정수+정수+정수+정수=정수로 자동 보장, USD도 2자리+2자리 합은 2자리로 자동 보장)
7. `totalCostPrice`(L368)·`baseCostPrice`·`fuelCostAmt` 등 **원가(Cost) 계열은 전부 이번 범위 밖** — 내부 마진 추적용이라 "표출"과 무관, 손대지 않는다.

### ③ `buildBreakdown()` 리팩터 — 중복 재계산 제거(정합성 버그 예방)

**발견한 잠재 위험**: 현재 `buildBreakdown()`(L195-236)이 `fuelSurchargeSellingAmount: baseSellingPrice * fuelRate`(L223)를 **자체적으로 재계산**하고 있음 — `computeUpsFreight()` 본문에서 이미 계산한 `fuelSellAmt`(L346)과 완전히 별개 계산. 지금은 우연히 같은 공식이라 값이 일치하지만, 올림 로직을 한쪽에만 적용하고 깜빡하면 **`result.fuelSurchargeSellingAmount`(합계 계산에 쓰임)와 `result.breakdown.fuelSurchargeSellingAmount`(화면 표시에 쓰임, `UpsOrderBreakdownCard.tsx`가 참조하는 값)가 서로 달라지는 정합성 버그**가 생길 수 있다.

→ `buildBreakdown()`이 재계산하지 않고 **이미 올림 적용된 `fuelSellAmt` 값을 파라미터로 전달받아 그대로 사용**하도록 수정(함수 시그니처에 `fuelSellAmt: number` 파라미터 추가, 호출부 L370-372에서 전달). 회귀 테스트로 `result.fuelSurchargeSellingAmount === result.breakdown.fuelSurchargeSellingAmount` 항상 성립함을 검증.

### ④ `agency-pricing.ts :: computeAgencyFreight()` — 대리점 단계 올림 적용

`AgencyFreightInput`에 `currency: string` 필드 추가(호출부 `freight.ts`에서 `platform.currency` 전달). 기존 `Math.round(x * 100) / 100`(L29, L39, L40) → `ceilByCurrency(x, input.currency)`로 교체.

```ts
const discountedBase = ceilByCurrency(input.baseSellingPrice * (1 - input.discountRate), input.currency);
// ...
agencyCostPrice: ceilByCurrency(discountedBase + passthroughTotal + agencyChargesCostTotal, input.currency),
agencySellingPrice: ceilByCurrency(discountedBase + passthroughTotal + agencyChargesSellingTotal, input.currency),
```
`ceilByCurrency`는 `pricing-engine.ts`에서 import.

### ⑤ `shipper-pricing.ts :: computeShipperFreight()` — 화주 단계 올림 적용

함수 시그니처에 `currency: string` 파라미터 추가(호출부 `freight.ts` L294-300에서 `platform.currency` 전달 — 현재 positional 인자 방식이므로 순서 주의). 기존 `Math.round(x * 100) / 100`(L17, L24) → `ceilByCurrency(x, currency)`로 교체.

### ⑥ `freight.ts` 호출부 — `currency` 전달 배선

`computeAgencyFreight({...})` 호출(L266-276)에 `currency: platform.currency` 추가. `computeShipperFreight(...)` 호출(L294-300)에 `platform.currency` 인자 추가(위치 인자이므로 마지막 또는 적절한 위치 — 기존 시그니처 순서 유지하며 추가 위치는 Dave가 함수 정의와 맞춰 결정).

### ⑦ 표시 포맷 정리 (부수 작업 — 선택이 아닌 필수, 트레일링 ".00" 제거)

소스 값이 이미 정수(KRW)/2자리(USD)로 올림되므로, 화면에서 강제로 `.toFixed(2)`/`minimumFractionDigits:2`를 적용하면 KRW가 "526393.00"처럼 불필요한 소수점이 붙는다. JSJung이 원하는 "원 단위 올림 표시"에 맞춰 **KRW는 정수만, USD는 2자리** 표시로 통일:
- `UpsOrderBreakdownCard.tsx`(L123/127/132/138/142 부근, `currencyCode==='KRW'` 분기): `toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2})` → 통화별 분기(`currencyCode === 'KRW' ? toLocaleString() : toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})`)
- `UpsActualAdjustmentForm.tsx`(L300/308/369/417 — `estimatedTotal`/`actualTotal`/`item.amount`/`row.amount`): 동일하게 통화별 분기 적용(이 컴포넌트는 `currency` prop을 이미 갖고 있음 — 그대로 활용)
- `UpsFreightEstimatePanel.tsx`: 이미 `.toLocaleString()` 기본값이라 정수면 자동으로 소수점 없이 표시됨 — 소스가 이미 정수가 되므로 **코드 변경 불필요**(자연히 해결)
- `ShipperDailyBillingClient.tsx`: 이미 KRW는 `.toLocaleString()`(소수점 없음), USD는 `minimumFractionDigits:2` — **이미 정책과 일치, 변경 불필요**

과설계 금지: 이 4개 파일 외 다른 화면(요율표 관리 화면 등, 조사 단계에서 이미 범위 제외 확정)은 절대 건드리지 않는다.

## 회귀 테스트 방향

- `ceilByCurrency`: KRW `355100.01` → `355101`, USD `10.001` → `10.01`, 정확히 나누어떨어지는 값은 원값 유지(예: KRW `355100.0` → `355100`, 올림으로 인한 불필요한 +1 없어야 함)
- `computeUpsFreight`: 유류할증료 등 비율 계산으로 소수점이 생기는 실제 케이스(ZEN-2026-000073 파라미터 재현 — 기본운임 355100, 유류할증률 46.75%) 기준, ①`baseSellingPrice`+`fuelSurchargeSellingAmount`+`surgeFeeSellingAmount`+`otherChargesSellingTotal`(전부 정수) 합이 `totalSellingPrice`와 정확히 일치 ②`result.fuelSurchargeSellingAmount === result.breakdown.fuelSurchargeSellingAmount`(③번 정합성 버그 회귀 방지 핵심 케이스) ③원가(`totalCostPrice` 등)는 여전히 소수점 유지(올림 미적용 확인 — 범위 밖 항목 회귀 방지)
- `computeAgencyFreight`/`computeShipperFreight`: 할인율 적용으로 소수점이 발생하는 케이스(예: discountRate 0.15 등 나눠떨어지지 않는 비율)에서 결과가 KRW 정수/USD 2자리로 정확히 올림되는지
- USD 오더 케이스도 최소 1건 포함(KRW 전용으로 치우치지 않도록 — `ceilByCurrency`의 통화 분기 정확성 검증)
- 표시 포맷: `UpsOrderBreakdownCard.tsx`/`UpsActualAdjustmentForm.tsx`에 정수 KRW 값 전달 시 ".00" 미표시, USD는 2자리 표시 유지
- **독립 되돌리기 검증 필수** — ①올림 유틸 제거 시 기존 소수점 결과로 정확히 복귀하는지 ②`buildBreakdown` 파라미터 전달 방식 되돌려 재계산 방식으로 복원 시, 의도적으로 fuelRate 불일치 조건을 만들어 두 값이 달라지는(버그 재현) 테스트가 정확히 FAIL하는지

## R-10 (실 UI 검증)

- 신규 UPS 오더 1건을 실제로 등록(가능하면 유류할증률 등으로 소수점이 자연 발생하는 조건)해, 등록화면 예상운임 패널·오더상세 운임카드 양쪽에서 전부 정수(KRW) 금액으로 표시되는지, 개별 항목 합산이 합계와 정확히 일치하는지 확인
- 기존 오더(ZEN-2026-000073 등)는 이번 작업으로 값이 바뀌지 않아야 함 — 재조회해 기존 표시값(예: ₩526,392.25)이 그대로인지 확인(소급 미적용 검증)

## [작업 결과]

### 커밋

| 커밋 | 내용 |
|:-----|:-----|
| `a9c4f39b` | `[Dave] feat: TASK-B-302 UPS 운임 전체 올림(Ceiling) 정책 — ceilByCurrency 유틸 + 계산 로직·표시 레이어 적용 (Issue #1123)` |

### ① 공용 올림 유틸 — `pricing-engine.ts` `ceilByCurrency()`

- KRW는 정수(원) 단위, 그 외(USD 등)는 소수점 2자리(센트) 단위 올림.
- **설계 보강(발견)**: 순수 `Math.ceil(x*100)/100`은 IEEE float 드리프트(예: `18.51*100 = 1851.0000000000002`, `100.01+18.51 = 118.52000000000001`)로 이미 정수/센트인 값이 올림에 의해 +1 되는 오류 발생. **epsilon(1e-9·scale) 내 오차는 가장 가까운 단위값으로 정규화**해 흡수 — 테스트로 검증(TC-CEIL-01c: KRW `355100`→`355100`, USD `10.01`→`10.01`).

### ② `computeUpsFreight()` — 라인 항목 개별 올림 후 합산

- `currency` 결정을 함수 맨 앞으로 이동 (기존 return 직전에서만 결정 → 계산 각 단계에서 사용)
- `baseSellingPrice`: 4개 분기(FREIGHT ≤70/초과, EXPRESS·SAVER ≤20/초과) 공통 지점에서 올림
- `fuelSellAmt = ceilByCurrency(baseSellingPrice * fuelRate, currency)` (이미 올림된 base 기준)
- `applyOtherCharges()`: 각 charge별 `base_s + fuel_s` 개별 올림 후 `sellingTotal` 합산 — 화면 개별 항목 합 = 표시 합계 항상 일치. 원가(costTotal/base_c/fuel_c)는 범위 밖 그대로.
- `applySurgeFee()`: `sellingAmount = ceilByCurrency(base + base*fuelRate, currency)`. costAmount는 범위 밖.
- `totalSellingPrice`: 개별 올림값 단순 합 + **통화별 올림 한 번 더 적용** — KRW는 정수라 identity(영향 없음), USD는 float 드리프트를 센트 단위로 정규화(설계 보강).

### ③ `buildBreakdown()` — 유류할증 중복 재계산 제거 (정합성 버그 예방)

- 시그니처에 `fuelSellAmt: number` 파라미터 추가, 호출부에서 전달받아 `fuelSurchargeSellingAmount`에 그대로 사용 — 본문 재계산(`baseSellingPrice * fuelRate`) 제거.
- 되돌리기 검증: 재계산 방식 복원 시 `result.fuelSurchargeSellingAmount(166010)` vs `breakdown(166009.25)` divergence → **TC-CEIL-03/03r 정확히 FAIL** 확인 후 복원.

### ④ `computeAgencyFreight()` — 대리점 단계

- `AgencyFreightInput`에 `currency: string` 필드 추가 (호출부 `freight.ts`에서 `platform.currency` 전달)
- 기존 `Math.round(x*100)/100` 3곳(L29/L39/L40) → `ceilByCurrency(x, input.currency)` 교체

### ⑤ `computeShipperFreight()` — 화주 단계

- 시그니처에 `currency: string = 'KRW'` 파라미터 추가 (기존 테스트 하위호환 위해 기본값 유지, 호출부에서 `platform.currency` 전달)
- 기존 `Math.round(x*100)/100` 2곳(L17/L24) → `ceilByCurrency(x, currency)` 교체

### ⑥ `freight.ts` 호출부 — currency 배선

- `computeAgencyFreight({...})`에 `currency: platform.currency` 추가
- `computeShipperFreight(...)` 마지막 위치에 `platform.currency` 인자 추가

### ⑦ 표시 포맷 정리 (부수 작업)

- `UpsOrderBreakdownCard.tsx`: `fmtAmount` 헬퍼 신설(통화별 분기), 5개 금액 표시(기본/유류/급증/기타/총액) 적용 — KRW 정수 표시, USD 2자리 유지
- `UpsActualAdjustmentForm.tsx`: `fmtAmount` 헬퍼 신설, 5곳(estimatedTotal/actualTotal/variance/item.amount/row.amount) 적용
- `UpsFreightEstimatePanel.tsx`·`ShipperDailyBillingClient.tsx`: 소스가 이미 정수화되어 **변경 불필요** 확인 (설계서대로)

### 회귀 테스트 (13건 신설, `tests/unit/ups/task-b302-freight-ceil.test.ts`)

| TC | 내용 |
|:---|:-----|
| TC-CEIL-01a/b/c | ceilByCurrency 단위 — KRW 정수 올림 / USD 센트 올림 / 나누어떨어지는 값 원값 유지(float drift 흡수 포함) |
| TC-CEIL-02 | ZEN-2026-000073 재현(base 355100, fuel 46.75%) — 개별 항목 올림 합 = totalSellingPrice 정합성 |
| TC-CEIL-03 | `result.fuelSurchargeSellingAmount === breakdown.fuelSurchargeSellingAmount` (buildBreakdown 정합성) |
| TC-CEIL-03r | fuelSellAmt 파라미터 재사용 검증 — 독립 재계산 시 divergence 버그 재현 방지 |
| TC-CEIL-03b | 기타 부가요금 포함 시 개별 항목 합 === sellingTotal |
| TC-CEIL-04 | 원가 계열 올림 미적용 (소수 원가 비율 케이스 — `% 1 !== 0`) |
| TC-CEIL-05 | USD 오더 — 센트 단위 올림 정확성 (base 100.005→100.01, total 118.52) |
| TC-CEIL-06/06b/07/07b | Agency/Shipper 단계 KRW 정수·USD 센트 올림 |

### 기존 테스트 정책 반영

- `pricing-engine.test.ts`: surge 판매가 기대값 `toBeCloseTo` → 올림 정수값(27978/25181)으로 수정 (정책 변경 반영)
- `ups-order-breakdown-card.test.tsx`: KRW 표시 `.00` 제거(`₩306,200` 등), USD는 2자리 유지

### 독립 되돌리기 검증 (필수)

| 원복 대상 | 결과 |
|:----------|:-----|
| `baseSellingPrice = ceilByCurrency(...)` 제거 | **TC-CEIL-05 정확히 FAIL** (USD base 100.005가 100.01로 안 올림됨) → 복원 후 PASS (KRW base는 정수라 no-op — USD 케이스가 실질 검증) |
| `buildBreakdown` 재계산 방식 복원(`baseSellingPrice * fuelRate`) | **TC-CEIL-03/03r 정확히 FAIL** (166009.25 vs 166010 divergence 재현) → 복원 후 PASS |

### 검증

- `npm run test:regression`: **1343/1343 PASS** (194파일, 신규 +13 — 191→194파일)
- `npm run build`: SUCCESS
- 기존 UPS 관련 336건(38파일) 일괄 PASS — 회귀 없음
- `LIVE_REGRESSION_TEST_MAP.md`에 TC-CEIL-01~07 추가 (R-09 DoD)

### (R-10) 라이브 브라우저 검증

Dave 환경 브라우저 부재 — 병합 후 JSJung 실브라우저 검증 요청: ①신규 UPS 오더 등록 시 예상운임 패널·오더상세 운임카드 KRW 정수 표시 + 개별 항목 합=합계 확인 ②기존 오더(ZEN-2026-000073 등) 재조회 시 값 불변(소급 미적용) 확인. (자동화 회귀 테스트로 소스 로직 검증 완료)

## [Jaison 최종 검토]

_(PR 제출 후 작성 예정)_

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
