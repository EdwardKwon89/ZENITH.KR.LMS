# DEF-111: 관리자 수동 트래킹 이벤트로 `DELIVERED` 입력해도 오더 상태(`zen_orders.status`)가 변경되지 않음

## 발견 경위
Edward 질문 "실제 배송 완료 및 청구, 정산 완료까지 어떻게 검증할 수 있는가?"에 답하기 위해 2026-07-20 실제 E2E 검증 수행 중 발견(Aiden, TASK-186/187/191/192와 무관한 범위 밖 이슈).

## 조사 결과

관리자 오더 상세 화면의 "수동 트래킹 이벤트 추가"(`AdminTrackingControl.tsx`)에서 Event Code=`DELIVERED`를 선택해 제출하면, `addTrackingEvent()`(`src/app/actions/operations/tracking.ts`)가 `zen_tracking_events`에 이벤트 행(`event_code=DELIVERED`, `source_type=MANUAL`)을 정상 INSERT한다.

**그러나 이 호출은 `TrackingManager.syncOrderStatus()`나 `update_order_status_atomic` RPC를 전혀 트리거하지 않는다.** `syncOrderStatus()`는 `src/lib/logistics/tracking.ts`의 `getTrackingData()` 내부에서만 호출되고, `getTrackingData()`는 `provider_type === 'API'`인 경우에만 이 로직을 실행한다 — MANUAL 소스 이벤트 삽입 경로에는 연결되어 있지 않음.

실제 테스트 오더(ZEN-2026-000001, id `e1658577-a5ab-4338-8191-3f1104e83dd9`)로 재현: DELIVERED 이벤트 제출 후 UI 새로고침 및 `zen_orders.status` 직접 조회 결과 모두 `REGISTERED`로 그대로 남아있음을 확인.

## 영향 범위
- **UPS 사후청구(Issue #589/TASK-186) 기능이 실질적으로 트리거될 방법이 없음**: `UpsActualAdjustmentForm`은 `orderStatus === 'DELIVERED'`일 때만 활성화되는데, 실제 UPS API 연동(`provider_type='API'`)이 아닌 수동/테스트/일부 캐리어 경로에서는 상태가 DELIVERED로 자동 전환될 방법이 없어 이 폼 자체가 영구히 비활성 상태로 남을 수 있음.
- 관리자가 "배송 완료됐다"는 사실을 수동으로 기록할 방법(트래킹 이벤트 추가)과 "오더 상태를 DELIVERED로 바꾸는" 방법이 분리되어 있다는 것을 관리자가 인지하지 못하면, 배송완료 처리 자체가 누락된 채로 방치될 위험.

## 재현 방법
1. 아무 오더(REGISTERED 상태) 상세 페이지 접속 (admin 권한)
2. "수동 트래킹 이벤트 추가"에서 Event Code=DELIVERED로 제출
3. 페이지 새로고침 후 "주문 상태" 필드 확인 → REGISTERED 그대로(변경 안 됨)

## 긴급도
Medium — UPS 실 배송은 API 연동(`provider_type='API'`) 경로로는 정상 동작할 가능성이 있으나(미검증), 수동/예외 처리 경로에서는 사후청구 기능 자체가 그림의 떡이 됨. 실사용 영향 범위 확인 전까지는 High로 격상 검토 필요.

## 권장 조치
- **옵션 A**: `addTrackingEvent()`(MANUAL 소스)에서도 이벤트 코드가 상태 매핑 대상(`statusMapping`)에 해당하면 `update_order_status_atomic`을 함께 호출하도록 확장.
- **옵션 B**: 관리자 UI에 "트래킹 이벤트 추가"와 별개로 "배송 완료 처리"라는 명시적 액션(오더 상태를 DELIVERED로 전환하는 기존 `updateOrderStatus()` 호출)을 UPS 오더 상세 화면에 노출.
- 실제 UPS API 연동 경로(`provider_type='API'`)에서 `syncOrderStatus()`가 실제로 잘 동작하는지도 별도로 검증 필요(이번 세션에서는 MANUAL 경로만 확인함).

## 관련 파일
`src/app/actions/operations/tracking.ts`(`addTrackingEvent`), `src/lib/logistics/tracking.ts`(`TrackingManager.syncOrderStatus`, `getTrackingData`), `src/components/tracking/AdminTrackingControl.tsx`, `src/app/actions/finance/ups-actual-charges.ts`(DELIVERED 게이트)

## 보고
Aiden 발견, 2026-07-20. 관련 DEF-112(같은 검증 세션에서 함께 발견)와 연쇄적 문제 — DEF-111이 해결되지 않으면 DEF-112 경로 자체에 도달하기 어려움.

**GitHub Issue 등록**: [#621](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/621) (team:b, priority:p2) — Team B 현재 진행 작업의 커버 범위 확인 요청, 미커버 시 Team A 처리 예정(Edward 지시, 2026-07-20).
