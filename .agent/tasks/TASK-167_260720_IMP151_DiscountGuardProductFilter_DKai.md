# TASK-167: IMP-151 getMaxAllowedZoneDiscount product_id 필터 추가

> **Issue**: [#614](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/614)
> **생성일**: 2026-07-20
> **담당**: D_Kai
> **상태**: 🔔 (검토 요청)

## 📋 업무 개요

`getMaxAllowedZoneDiscount`가 Zone 전체 상품(WW_EXPRESS*, WW_EXPEDITED, WW_FLIGHT의 더미 판매가 포함)을 검사하여 모든 Zone의 허용 할인율이 0%로 계산되는 버그 수정.

## 🔧 변경 사항

### 1. `src/lib/ups/discount-guard.ts`
- `productIds?: string[]` 선택적 파라미터 추가
- 파라미터 전달 시 `product_id` IN 필터를 baseRates/tierRates/freightMinimums 3개 쿼리에 적용
- 미전달 시 기존 전체 검사 유지 (하위 호환성)

### 2. `src/app/actions/ups/rates-mutation.ts`
- `upsertAgencyPricingPolicy`에 `product_ids?: string[]` 선택적 필드 추가
- `getMaxAllowedZoneDiscount` 호출 시 전달

### 3. `src/app/actions/agency/zone-discounts.ts`
- `upsertShipperZoneDiscounts`에 `productIds?: string[]` 선택적 파라미터 추가
- `getMaxAllowedZoneDiscount` 호출 시 전달

### 4. `tests/unit/ups/discount-guard.test.ts` (신규)
- TC-UPS-DISCOUNT-01~04: productIds 필터 동작 검증 4종

## ✅ 검증

| 항목 | 결과 |
|:----|:----:|
| TC-UPS-DISCOUNT-01~04 | 4/4 PASS |
| rates-admin-actions.test.ts | 13/13 PASS |
| 전체 UPS 단위 테스트 | 17/17 PASS |
| 전체 회귀 테스트 | 644/644 PASS |

## 📝 작업 결과

**커밋**: `f0b4629e` — 코드 + 테스트
**커밋**: `(이 문서)` — task file + ACTIVE_TASK

## 🔗 향후 과제

- Issue #605 (Matrix 설계)에서 UI 측 product_ids 선택 UI 구현 필요
- 현재 product_ids 미전달 시 Zone 전체 검사 (더미 데이터 Zone은 여전히 0%)
