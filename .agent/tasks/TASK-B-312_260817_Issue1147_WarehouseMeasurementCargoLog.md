# TASK-B-312: 창고 입고 실측에도 화물정보 이력 기록 추가

- **GitHub Issue**: [#1147](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/1147)
- **관련 결함**: [DEF-B-137](.agent/defects/DEF-B-137_창고입고실측_화물이력_미기록.md)
- **등록일**: 2026-08-17
- **등록자**: Jaison (JSJung 실사용 피드백)
- **담당**: Mike
- **우선순위**: P2
- **상태**: ✅ 완료 (PR#1148 머지, 2026-08-17, 병합 커밋 `0abdf531`)

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

(Mike 작성, `.agent/tasks/TASK-B-312_inbound_cargo_history.md`에 별도 생성됐던 내용을 병합·정리 — 중복 파일은 삭제)

1. ✅ `applyPackageMeasurements()`에 old/new 화물 스냅샷 기록 추가 — `select('*')`로 package_id 포함 조회(TASK-B-311 재발 방지 반영)
2. ✅ `weightVolumeChanged` 가드 + `cargoSummaryEquals` 비교 후 `zen_order_edit_log` insert
3. ✅ 1차 반려(테스트 실패) 후 mock `fromCallCount` 매직넘버(5→7) 정확히 보정

빌드 SUCCESS, 회귀 201 test files / 1407 tests ALL PASS.

- 커밋: `e5a485b1`(구현) → `7b173ad4`(테스트 mock 보정)
- PR: [#1148](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1148)

## [Jaison 최종 검토]

**PR#1148 반려 (2026-08-17)** — 상세: [PR#1148 코멘트](https://github.com/EdwardKwon89/ZENITH.KR.LMS/pull/1148#issuecomment-5310398815)

핵심 로직(old/new cargo snapshot, `select('*')`로 package_id 포함 조회 — TASK-B-311 재발 방지 반영됨, `weightVolumeChanged` 가드)은 정확함. 다만 PR 스스로 "200/201 PASS"라고 명시한 대로 테스트 1건이 실제로 실패하는 상태로 제출됨(R-08 위반 — 실패를 인지하고도 제출).

**원인**: `tests/unit/logistics/inbound.test.ts`의 mock이 `fromCallCount`(호출 순번) 기반으로 `zen_order_packages` 분기를 하는데, TASK-B-312가 루프 이전에 호출 2건을 추가하면서 기존 `fromCallCount >= 5` 매직넘버가 밀려 루프 안 `currentPkg` 단일조회가 잘못된 분기(목록조회용 chain, `maybeSingle` 없음)에 걸림 — `TypeError: ...maybeSingle is not a function`. 이번 fallback 시도로는 카운터 밀림 자체가 해결 안 됨.

GitHub Issue 라벨 `status:review` → `status:rework` 갱신 완료.

---

**PR#1148 최종 승인·머지 (2026-08-17)** — 병합 커밋 `0abdf531`

`fromCallCount >= 5` → `>= 7` 정확한 보정 확인. 격리 워크트리 재검증: 회귀 201/201·1407/1407 ALL PASS(이전 실패하던 TC-DEF-B-016 포함), 빌드 성공, CI 3종 PASS. 핵심 로직은 1차 검토에서 이미 diff로 검증 완료. 승인 후 머지, Issue #1147 close 완료.

R-10(창고 입고 실측 화면에서 중량 수정 → 등록/수정 이력 화물정보 표시 확인) 스크린샷 미첨부 — JSJung 라이브 확인 필요.

## [발견 이슈]

없음
