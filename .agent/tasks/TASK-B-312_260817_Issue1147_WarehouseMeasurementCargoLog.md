# TASK-B-312: 창고 입고 실측에도 화물정보 이력 기록 추가

- **GitHub Issue**: [#1147](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1147)
- **관련 결함**: [DEF-B-137](.agent/defects/DEF-B-137_창고입고실측_화물이력_미기록.md)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P2
- **상태**: 🔄 착수 가능 (설계 확정, 착수 직행)

## [배경]

JSJung이 ZEN-2026-000008의 중량을 창고 입고 실측 화면에서 수정했는데 "등록/수정 이력"(TASK-B-311)에 반영 안 되는 것을 발견. 원인은 `applyPackageMeasurements()`(`src/app/actions/operations/orders.ts:829`, `saveInboundMeasurements`/`confirmInbound`가 호출)가 `updateOrder()`와 별개의 함수라 TASK-B-311의 화물정보 이력 기록 로직이 적용되지 않았기 때문.

## [설계 확정] (JSJung 승인)

TASK-B-311에서 만든 `extractCargoSummarySnapshot()`/`cargoSummaryEquals()`(`src/lib/orders/edit-log-fields.ts`)를 그대로 재사용해 `applyPackageMeasurements()`에도 동일한 방식으로 `zen_order_edit_log` 기록 추가.

- 패키지 업데이트 루프 **시작 전**: 해당 오더의 전체 패키지+품목을 조회해 `oldCargoSnapshot` 계산 (updateOrder()와 동일하게 `getItemsFullByOrderId()`로 package_id 포함 조회 — TASK-B-311 2차 반려에서 확인된 실수 재발 방지)
- 루프에서 실제 변경 적용 **완료 후**: 다시 조회해 `newCargoSnapshot` 계산
- `cargoSummaryEquals(oldCargoSnapshot, newCargoSnapshot)`가 false면 `zen_order_edit_log`에 insert:
  - `action: 'UPDATE'`
  - `old_data: { cargo_summary: oldCargoSnapshot }`, `new_data: { cargo_summary: newCargoSnapshot }` (헤더 필드는 이 경로에서 변경되지 않으므로 화물 정보만)
  - `edited_by: profile.id`, `order_status_at_edit: orderMeta?.status`, `edited_at: 현재 시각`
- 기존 `order_status_history` insert(스테퍼용 사유 기록)는 그대로 유지 — 중복이 아니라 서로 다른 화면(스테퍼 vs 등록/수정 이력)에 쓰이므로 병행 유지

## [작업 범위]

파일: `src/app/actions/operations/orders.ts`의 `applyPackageMeasurements()` 함수
1. 함수 시작 부분(패키지 업데이트 루프 전)에 old cargo snapshot 계산 추가
2. 루프 종료 후 new cargo snapshot 계산 + 비교 + `zen_order_edit_log` insert 추가

## [회귀 테스트 방향]

- `saveInboundMeasurements()` 호출로 패키지 중량 변경 시 `zen_order_edit_log`에 UPDATE 로그가 새로 생기는지(실 DB 통합테스트, 기존 `iss1125-order-edit-log.test.ts` 패턴 재사용)
- 변경 없는 실측 호출(같은 값으로 저장)은 로그가 안 생기는지
- old_data/new_data의 cargo_summary가 실제 변경 전/후 값과 일치하는지

## [R-10]

WAREHOUSED 상태 UPS 오더를 창고 입고 실측 화면에서 중량 수정 → 오더 상세의 "등록/수정 이력"에 화물정보 변경이 표시되는지 스크린샷.

## [작업 결과]

_(Mike 작성 예정)_

## [Jaison 최종 검토]

_(PR 제출 후 작성)_

## [발견 이슈]

없음
