# TASK-193: Issue #621 — 수동 트래킹 이벤트 DELIVERED 입력 시 오더 상태 미반영 수정

**담당**: D_Kai
**생성일**: 2026-07-20
**우선순위**: P2
**상태**: 🔄

---

## [배경]

Aiden이 UPS 오더 전체 흐름(등록→배송완료→사후청구→정산) E2E 검증 중 발견(DEF-111/Issue #621). 관리자 "수동 트래킹 이벤트 추가"(`AdminTrackingControl.tsx`)에서 `DELIVERED`를 입력해도 `zen_orders.status`가 바뀌지 않음 — `addTrackingEvent()`(`src/app/actions/operations/tracking.ts`)가 이벤트를 `zen_tracking_events`에 INSERT만 하고, 상태 동기화 로직(`TrackingManager.syncOrderStatus()`, `src/lib/logistics/tracking.ts`)은 `getTrackingData()`(API provider 전용 경로)에서만 호출되기 때문.

Team B(Dave/Baker/Mike)는 이 파일들을 다룬 이력이 없음을 커밋 로그로 확인(순수 Team A 영역) — Issue #621에 Team B 커버범위 확인 코멘트를 남겼으나 응답과 무관하게 Team A가 처리.

## [작업 범위]

`addTrackingEvent()`에서 이벤트 INSERT 후, 해당 `event_code`가 `statusMapping`(`tracking.ts`)에 정의된 상태로 매핑되고 현재 오더 상태와 다르면, 기존에 검증된 `updateOrderStatus()`(role/상태전이 가드 포함, `src/app/actions/operations/orders.ts`) 경로를 통해 상태를 전환한다. `syncOrderStatus()`를 직접 재사용하거나 `updateOrderStatus()`를 호출하는 것 중 상태전이 가드(`canChangeStatus`)를 우회하지 않는 방식을 택할 것 — 신규 상태머신을 만들지 말고 기존 가드 경로를 재사용.

- MANUAL 소스 이벤트뿐 아니라 API 소스 경로도 동일 가드를 타는지 회귀 확인(기존 API 경로 동작 변경 없어야 함)
- 원본 발견 시나리오(관리자가 REGISTERED 오더에 DELIVERED 이벤트 수동 입력 → 상태 DELIVERED 전환 확인)를 회귀 테스트로 추가

## [DoD]

- [ ] `addTrackingEvent()` — MANUAL 이벤트도 상태 매핑 시 `updateOrderStatus()`(또는 동등 가드 경로)로 상태 전환
- [ ] 기존 API 경로(`getTrackingData`→`syncOrderStatus`) 동작 무변경 확인
- [ ] 신규 회귀 테스트 — 관리자 수동 DELIVERED 이벤트 → 오더 상태 DELIVERED 전환 확인
- [ ] 권한 가드 확인 — 상태 전이 권한 없는 역할의 수동 이벤트 입력 시 이벤트는 기록되되 상태는 전환 안 됨(또는 전이 자체를 차단) 중 하나를 명확히 하고 테스트로 고정
- [ ] 전체 회귀 테스트 PASS
- [ ] `./scripts/next-task-number.sh A`로 채번 확인 후 착수 (TASK-193 확정 배정됨, 재확인만)

## [Aiden 확인 사항]

착수 전 코드 경로 재확인: `src/lib/logistics/tracking.ts`의 `statusMapping`(약 62~77행)이 `'DELIVERED'` 외에 어떤 이벤트 코드들을 어떤 상태로 매핑하는지 전체 목록을 먼저 파악하고, 그 전체 목록에 대해 이번 수정이 적용되는지 확인할 것(DELIVERED만 임시로 고치는 방식 지양).

## [발견 이슈]

없음
