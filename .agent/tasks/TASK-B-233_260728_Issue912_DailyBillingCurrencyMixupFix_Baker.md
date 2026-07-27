# TASK-B-233: Issue #912 — /finance/daily-billing 통화 혼재로 청구액 오류 (KRW→USD 오표시 + 환율 이중 적용)

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#912](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/912) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔄 |

## 개요

`/finance/daily-billing` 화면에서 `zen_order_costs` 테이블의 `currency` 필드를 무시하고 모든 비용 행을 USD로 가정하여 합산하고 있음.
KRW 통화 비용이 USD로 오표시되고, USD 비용은 환율 적용 없이 숫자만 합산되거나 이중 적용되는 문제가 있음.

## 조치안 (Baker 구현)

### 1. `convertToKrw()` 헬퍼 함수 추가 (`daily-billing.ts`)
- `currency === 'KRW'` → `total_amount` 그대로 반환
- `currency === 'USD'` → `total_amount × exchangeRate` 반환
- 그 외 → `0` 반환 + `hasUnsupportedCurrency = true` 플래그

### 2. `getShipperDailyBillingSummary()` 수정
- 비용 합산 루프에서 `convertToKrw(cost)` 적용
- `ShipperDailyBillingGroup` 인터페이스:
  - `totalBillingAmountUsd` → `totalBillingAmountKrw` (KRW 기준 합계)
  - `estimatedBillingAmountKrw` → `estimatedBillingAmountUsd` (KRW→USD 역변환)
  - `hasUnsupportedCurrency` 필드 추가

### 3. `getShipperDailyOrdersDetails()` 수정
- select에 `currency` 추가
- 4번째 파라미터 `exchangeRate?: number` 추가
- `ShipperDailyOrderRow` 인터페이스:
  - `totalAmountUsd` → `totalAmountKrw`
  - `hasUnsupportedCurrency` 필드 추가

### 4. 프론트엔드 `ShipperDailyBillingClient.tsx` 수정
- KPI 배너: `₩ {value.toLocaleString()}` → `$ {value.toLocaleString()}`
- 테이블 금액 컬럼: `₩` 기호 → `$` 기호
- `hasUnsupportedCurrency` 경고 ZenBadge 표시

## 테스트 결과

- 단위 테스트 4건 신규 (KRW only / USD only / KRU+USD 혼합 / 미지원 통화 TWD)
- 기존 테스트 7건 갱신 (currency 필드 추가 + 필드명 변경 반영)
- 전체 회귀: **137/137 files · 917/917 tests ALL PASS**

## 변경 파일

- `src/app/actions/finance/daily-billing.ts` — convertToKrw + 인터페이스 갱신
- `src/components/finance/ShipperDailyBillingClient.tsx` — 프론트엔드 통화 기호·레이블
- `tests/unit/finance/daily-billing-aggregation.test.ts` — 테스트 4건 신규 + 기존 7건 갱신

## 완료보고 절차

1. 코드 커밋 (`[Baker] fix: ...`)
2. task file 🔔 전환
3. ACTIVE_TASK.md 반영
4. PR 생성 (`Closes #912`)
