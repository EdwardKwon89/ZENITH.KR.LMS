# TASK-190: IMP-151 getMaxAllowedZoneDiscount product_id 필터 추가

> **Issue**: [#614](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/614) (Close) · 후속 [#616](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/616)(Team B)
> **생성일**: 2026-07-20
> **담당**: D_Kai
> **상태**: ✅

> **번호 정정 안내(Aiden, 2026-07-20)**: D_Kai가 최초 제출 시 이미 사용 중인 TASK-167로 착수해(기존 TASK-167 파일 3건과 번호 충돌 — `next-task-number.sh` 미확인), Aiden이 Task-ID를 TASK-190(원 배정 번호)으로 정정하고 파일명을 변경함. 내용은 D_Kai 원본 그대로 보존.

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
| 실제 CI | Regression Tests SUCCESS |

## 📝 작업 결과

**커밋**: `f0b4629e` — 코드 + 테스트
**커밋**: `36d69a42` — task file + ACTIVE_TASK (원 파일명 TASK-167, Aiden이 TASK-190으로 정정)
**PR**: #615 ✅ Aiden 승인·머지 완료

## 🔗 향후 과제 / 범위 재정의(Aiden, 2026-07-20)

- 착수 전 예상과 달리, 이 PR이 수정한 `upsertAgencyPricingPolicy`·`upsertShipperZoneDiscounts`는 **현재 화면(`ups-rates-client.tsx`, `ZoneDiscountForm.tsx`)에서 실제로 호출되지 않는 죽은 코드**임을 Aiden이 확인함 — 두 화면 모두 예약 요금 시스템(`createPricingSchedule`, Issue #391)만 사용하며, 그 경로에는 마진 검증 자체가 없음
- 이 함수 자체(상품 스코프 버그 수정)는 정확하고 재사용 가능하므로 그대로 승인·병합
- 실제 예약 시스템에 마진 검증을 연결하는 작업은 해당 시스템을 설계한 **Team B에 Issue #616으로 이관** — Team A 범위 아님
- Issue #605(Matrix 설계)에서 UI 측 product_ids 선택 UI 구현은 여전히 별도 과제
