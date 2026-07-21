# DEF-114: `ROLE_PERMISSIONS`에 AGENCY 항목 누락 — 창고관리 기능 전체가 AGENCY 역할에서 500 에러

| 항목 | 내용 |
|:----|:----|
| **발견 경위** | 사용자(JSJung, agency@zenith.kr 세션)가 "입고확정 처리" 시 500 에러 실사용 보고 |
| **긴급도** | **즉시(Critical)** |
| **발견자** | Jaison |
| **발견일** | 2026-07-22 |

## 현상

`agency@zenith.kr`(AGENCY 역할)로 로그인한 상태에서 "입고확정" 버튼 클릭 시 500 에러 발생. 로컬 dev 서버 로그:

```
⨯ Error: AGENCY 역할은 WAREHOUSED 상태로 변경할 권한이 없습니다.
    at updateOrderStatus (src/app/actions/operations/orders.ts:395:11)
  ...
 POST /ko/warehouse/inbound 500 in 587ms
  └─ ƒ confirmInbound("303f3ee1-74b9-4828-8f76-4106bde4fd01", "NORMAL", "") ...
```

## 근본 원인

`src/lib/logistics/status-machine.ts`의 `canChangeStatus()`는 2단계 검증을 수행한다:
1. `TRANSITION_RULES` — 상태 전이 자체가 유효한지 (여기는 통과)
2. `ROLE_PERMISSIONS[role]` — 해당 역할이 그 target 상태로 변경할 권한이 있는지

`ROLE_PERMISSIONS`(`status-machine.ts:35-40`)에는 `OPERATOR`/`CARRIER`/`CORPORATE`/`INDIVIDUAL` 항목만 있고 **`USER_ROLES.AGENCY` 항목이 아예 없다.** `Partial<Record<UserRole, OrderStatus[]>>`이므로 없는 키는 `undefined` → `allowedByRole = []` → `allowedByRole.includes(target)`이 항상 `false` → **AGENCY 역할은 `updateOrderStatus()`를 통한 모든 상태 변경이 무조건 실패한다**(ADMIN/MANAGER/ZENITH_SUPER_ADMIN은 1번 검증에서 전부 우회하므로 이 버그의 영향을 받지 않음 — `canChangeStatus():50-53`).

## 영향 범위 (전부 재현 확인 가능한 코드 경로, `WAREHOUSE_ROLES`에 AGENCY 포함되어 있어 UI 접근 자체는 되지만 실행 시 전부 500):

| 액션 | 파일:라인 | target 상태 |
|:-----|:---------|:-----------|
| `confirmInbound` (입고확정) | `orders.ts:655` | WAREHOUSED |
| `confirmOutbound` (출고확정) | `warehouse.ts:158` | RELEASED |
| `confirmPickup` (픽업완료) | `warehouse.ts:228` | SCHEDULED |
| `cancelPickup` (픽업취소) | `warehouse.ts:242` | REGISTERED |
| `confirmUpsRegistration` (UPS접수) | `warehouse.ts:382` | PACKED |
| `undoUpsRegistration` (UPS등록취소) | `warehouse.ts:418` | WAREHOUSED |
| `confirmDeparture` (출고확정처리) | `warehouse.ts:485` | IN_TRANSIT |
| `undoOutbound` (출고취소) | `warehouse.ts:513` | PACKED |
| `cancelInbound` (입고취소) | `orders.ts` 내 `getHeldPreviousStatus` 패턴 | REGISTERED 또는 SCHEDULED |

**즉 Issue #635(Task A~D)로 이번 스프린트에 구현한 창고관리 기능 전체가, 정작 그 기능의 주 사용 대상인 AGENCY 역할에서는 UI는 뜨지만 액션 실행 시 전부 500으로 막혀있는 상태.** `WAREHOUSE_ROLES` 상수 자체엔 AGENCY가 명시적으로 포함되어 있어(기능을 쓰게 하려는 의도가 명확함) 설계 의도와 실제 동작이 불일치한다.

## 참고 — PR#646(Task C) 리뷰 시 발견했던 관련 정황

PR#646 검토 당시 Baker가 `ROLE_PERMISSIONS[OPERATOR]`에 `WAREHOUSED/PACKED/RELEASED/IN_TRANSIT`를 추가한 것을 발견했으나, `OPERATOR`는애초 `WAREHOUSE_ROLES`에 포함되지 않아 실질적 효과가 없는 변경이라 "블로커 아님, 의도 확인 차 남겨둠" 정도로만 코멘트했었다(승인 코멘트 참조). 지금 보면 **원래 필요했던 건 `AGENCY` 항목 추가였는데 `OPERATOR`로 잘못 넣은 것으로 추정** — 이번 수정 시 그 부분도 함께 정리 필요.

## 임시 조치

없음 (AGENCY 역할 사용자는 창고관리 기능 전체를 사용할 수 없는 상태로 방치 중 — 즉시 수정 필요).

## 목표 구현

`ROLE_PERMISSIONS`에 `[USER_ROLES.AGENCY]` 항목 추가. 위 표의 9개 target 상태(`REGISTERED, SCHEDULED, WAREHOUSED, PACKED, RELEASED, IN_TRANSIT`)를 포함해야 함. `WAREHOUSE_ROLES` 게이트가 이미 조직 스코프(AGENCY는 본인 소속 화주만)를 각 액션 내부에서 별도로 검증하고 있으므로, `ROLE_PERMISSIONS[AGENCY]`는 "상태값 화이트리스트" 역할만 하면 됨(추가 조직 스코프 로직 불필요, 이미 각 액션에 있음).

PR#646에서 잘못 추가된 `ROLE_PERMISSIONS[OPERATOR]`의 확장분(`WAREHOUSED/PACKED/RELEASED/IN_TRANSIT`)을 유지할지 원복할지는 담당자 판단 — OPERATOR가 실제로 이 기능을 써야 할 의도가 있었는지 불명확하므로 배정 시 함께 확인 요청.

## 관련 파일

- `src/lib/logistics/status-machine.ts` (35-40행 `ROLE_PERMISSIONS`)
- `src/app/actions/operations/warehouse.ts`
- `src/app/actions/operations/orders.ts`
- `tests/unit/logistics/status-machine.test.ts` (AGENCY 케이스 회귀 테스트 추가 필요)

## 예상 공수

Low (0.5일 이내 — 권한 목록 추가 + 회귀 테스트 + AGENCY 역할로 9개 액션 전부 실제 동작 확인)

## 우선순위

**P1 — 즉시**: 최근 스프린트(Issue #635 A~D) 전체 기능이 실사용 역할(AGENCY)에서 동작 불능 상태
