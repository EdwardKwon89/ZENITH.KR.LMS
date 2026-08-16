# DEF-B-137: 창고 입고 실측(applyPackageMeasurements)에서 화물정보 이력 미기록

**발견일**: 2026-08-17
**발견자**: JSJung (실사용 확인, ZEN-2026-000008) → Jaison 원인 분석
**긴급도**: Medium

## 현상

UPS 오더(ZEN-2026-000008, 상태 WAREHOUSED)의 중량을 창고 입고 실측 화면에서 수정했는데, "등록/수정 이력"(TASK-B-310/311에서 추가한 화물정보 그룹)에 반영되지 않음.

## 원인

- 해당 오더 패키지의 `measured_at`이 CREATE 로그(21:37:55)보다 늦은 시각(21:38:59)으로 찍혀 있어, 일반 오더 수정 화면이 아니라 **창고 "입고 실측" 화면**에서 수정된 것으로 확인.
- 이 경로는 `saveInboundMeasurements()`/`confirmInbound()` → `applyPackageMeasurements()`(`src/app/actions/operations/orders.ts:829`)이며, TASK-B-311이 화물정보 이력 기록을 추가한 `updateOrder()`와 **완전히 별개의 함수**. `applyPackageMeasurements()`는 `zen_order_edit_log`에 아무것도 기록하지 않음.
- TASK-B-284(Issue #1070) 설계상 `measured_at`이 찍힌 패키지는 일반 수정화면(`updateOrder()`)이 덮어쓰지 못하도록 보호되므로, 이 패키지의 사실상 유일한 변경 통로가 창고 실측 경로인데 정작 여기가 이력 기록 대상에서 빠져 있었음.
- 완전히 기록이 안 남는 것은 아니고 `order_status_history`에 "[입고 측정 변경] {pkgId}: 중량 X→Y..." 형태로 사유가 남지만, 이건 스테퍼(상태 전이)용 테이블이라 "등록/수정 이력" 패널(`zen_order_edit_log` 기반)에는 표시되지 않음.

## 영향 범위

`applyPackageMeasurements()`를 거치는 모든 창고 입고 실측 변경(`saveInboundMeasurements`, `confirmInbound`)이 "등록/수정 이력"에서 누락됨.

## 권장 조치

TASK-B-312로 처리 — `applyPackageMeasurements()`에도 TASK-B-311과 동일한 `extractCargoSummarySnapshot`/`cargoSummaryEquals`를 재사용해 변경 전/후 스냅샷을 `zen_order_edit_log`에 기록.
