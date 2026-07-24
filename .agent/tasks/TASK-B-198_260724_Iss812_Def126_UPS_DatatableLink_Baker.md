# TASK-B-198: DEF-126 — OrderDataTable UPS 주문 View Details 링크 분기

## 메타

| 항목 | 값 |
|:-----|:---|
| **Task 번호** | TASK-B-198 |
| **Issue** | #812 (DEF-126) |
| **에이전트** | Baker |
| **착수일** | 2026-07-24 |
| **Priority** | P1 |
| **상태** | 🔔 |
| **커밋** | `0bd81c01` |
| **PR** | [PR#821](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/821) |

## 배경

TASK-189/TASK-209로 만든 UPS 전용 상세 화면(`/orders/[orderId]/ups-detail`)이 오더 목록 "View Details" 링크로는 도달 불가. `OrderDataTable.tsx:129-134`의 링크가 `transport_mode`와 무관하게 항상 `/orders/${order.id}`로 고정됨.

## 변경 내용

### 코드 변경
- `src/components/orders/OrderDataTable.tsx:130`: `transport_mode === 'UPS'`일 때 `/ups-detail`로 분기

### 테스트
- `tests/unit/orders/order-datatable-link.test.tsx` 신규 추가 (2건)
  - UPS가 아닌 경우 → `/orders/{id}` (표준 상세)
  - UPS인 경우 → `/orders/{id}/ups-detail` (UPS 상세)

## 검증 결과

| 항목 | 결과 |
|:-----|:-----|
| 전체 회귀 | ✅ 117 files / 777 tests ALL PASS |
| 신규 테스트 | ✅ 2건 PASS |
| 빌드 | ✅ PASS |
