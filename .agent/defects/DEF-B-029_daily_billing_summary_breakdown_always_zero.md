# DEF-B-029: 화주별 일별 청구 요약 목록의 기본운임/유류할증료/급증수수료/기타부과금이 항상 ₩0

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/finance/daily-billing` 요약 목록을 Jaison이 직접 코드 확인 |
| **긴급도** | Medium |
| **영향 범위** | `src/app/actions/finance/daily-billing.ts`(`getShipperDailyBillingSummary()`) |

## 현상

`/finance/daily-billing` 화면의 "청구서 목록" 요약 표에서 **기본운임·유류할증료·급증수수료·기타부과금 4개 열이 항상 ₩0**으로 표시됨. "총 합계" 열은 정상 표시됨.

## 근본 원인

`getShipperDailyBillingSummary()`(`daily-billing.ts:203-232`)가 그룹 생성 시 `totalBaseFreight`·`totalFuelSurcharge`·`totalSurgeFee`·`totalOtherCharge`·`totalActualAdjustment` 5개 필드를 전부 `0`으로 초기화(207-211행)하는데, 이후 인보이스 순회 루프에서 `totalBillingAmountKrw`(총 합계, 인보이스 `total_amount` 그대로 누적)만 갱신되고 **나머지 5개 필드는 파일 전체에서 이 초기화 지점 외에 단 한 번도 값이 증가하는 코드가 없음**(grep 확인 — 타입 선언 + 초기화, 두 곳뿐).

즉 계산이 누락된 게 아니라 애초에 시도조차 되지 않은 코드 — 인보이스 조회 쿼리(`invoiceSelect`)도 `zen_order_costs`를 전혀 조회하지 않아 항목별 데이터 자체가 없음.

**참고**: "상세" 펼침 화면(`getShipperDailyOrdersDetails()`)은 `metadata.source_order_id`로 오더를 역추적해 `zen_order_costs`에서 직접 cost_type별로 집계하므로 정상 표시됨 — 요약 표만 이 로직이 빠진 상태.

## 발생 시점

`git blame` 확인 결과 2026-07-23 최초 기능 구현(`686dab21`, TASK-203)부터 존재. TASK-237 전면 재설계(`1ebfef3e`)와 TASK-248(PR#962)에서도 건드리지 않은 영역이라 그대로 잔존 — 이번 세션 작업으로 인한 회귀 아님.

## 권장 조치

각 인보이스의 `metadata.source_order_id`로 오더를 역추적해 `zen_order_costs`를 조회, cost_type별로 그룹에 누적하는 로직을 요약 함수에도 추가. 전체 인보이스 목록에 대해 매번 오더/비용 조인이 발생하므로 쿼리 비용(다건 인보이스 시 N+1 방지 — `.in()` 일괄 조회로 처리) 고려 필요.
