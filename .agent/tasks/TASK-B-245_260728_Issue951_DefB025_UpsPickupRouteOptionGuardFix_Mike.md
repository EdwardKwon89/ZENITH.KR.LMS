# TASK-B-245: Issue #951 / DEF-B-025 — UPS 오더 픽업완료 route_option_id 가드 예외 처리

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#951](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/951) |
| **DEF** | [DEF-B-025](../defects/DEF-B-025_ups_pickup_complete_route_option_guard_blocks.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

JSJung 요청으로 `/ko/warehouse/pickup` 페이지를 Jaison이 직접 재현·근본원인 확인. 상세 내용은 DEF-B-025 참조.

`updateOrderStatus()`(`src/app/actions/operations/orders.ts:393-402`)의 REGISTERED→SCHEDULED 전이 가드가 `route_option_id`(AIR/SEA 라우팅 엔진 전용 값)를 요구하는데, UPS 오더는 이 라우팅 절차를 거치지 않아 `route_option_id`가 항상 NULL — `/warehouse/pickup` 페이지(UPS+PICKUP 오더만 조회)의 모든 "픽업 완료"가 100% 실패합니다.

**JSJung 확정**: UPS 오더의 픽업은 Agency 직원이 화주의 화물을 직접 픽업하고 상태를 SCHEDULED로 전환하는 것으로, route_option_id 정보 자체가 필요 없음 — UPS 오더에 대해 예외 처리.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `src/app/actions/operations/orders.ts` — `updateOrderStatus()` 수정

393~402행의 기존 가드:
```ts
if (currentOrder.status === OrderStatus.REGISTERED && nextStatus === OrderStatus.SCHEDULED) {
  const orderCheck = await supabase
    .from('zen_orders')
    .select('route_option_id')
    .eq('id', orderId)
    .maybeSingle();
  const routeOptionId = orderCheck?.data?.route_option_id;
  if (!routeOptionId) {
    throw new Error('경로를 먼저 선택해야 일정 확정(SCHEDULED)이 가능합니다.');
  }
}
```
을 아래로 교체 — 조건에 `&& currentOrder.transport_mode !== 'UPS'` 한 줄만 추가(그 외 로직 동일):
```ts
if (currentOrder.status === OrderStatus.REGISTERED && nextStatus === OrderStatus.SCHEDULED && currentOrder.transport_mode !== 'UPS') {
  const orderCheck = await supabase
    .from('zen_orders')
    .select('route_option_id')
    .eq('id', orderId)
    .maybeSingle();
  const routeOptionId = orderCheck?.data?.route_option_id;
  if (!routeOptionId) {
    throw new Error('경로를 먼저 선택해야 일정 확정(SCHEDULED)이 가능합니다.');
  }
}
```
`currentOrder`는 이미 `OrderRepository.getStatus()`(`select('status, transport_mode')`)로 조회되어 `transport_mode`를 포함하므로 추가 쿼리 불필요.

### 건드리지 않는 것 (범위 밖)

- `canChangeStatus()`/`ROLE_PERMISSIONS`(`status-machine.ts`) — AGENCY는 이미 REGISTERED→SCHEDULED 허용됨, 변경 불필요
- AIR/SEA 오더의 `route_option_id` 가드 자체 — 그대로 유지(UPS만 예외)
- `confirmPickup()`/`getPickupOrders()`(`warehouse.ts`) — 무관, 변경 없음

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-245-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 245 나와야 정상)
- [ ] 위 스펙대로 `orders.ts` 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. UPS 오더(REGISTERED→SCHEDULED)에서 `route_option_id`가 NULL이어도 `updateOrderStatus()`가 에러 없이 성공하는지 실측(원래 코드로 되돌리면 정확히 에러 던지는지 재현 확인)
  2. AIR/SEA 오더는 `route_option_id`가 NULL이면 여전히 기존과 동일하게 에러를 던지는지 확인(회귀 없음 — 이 가드 자체가 무력화되지 않았는지 검증)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 AGENCY 또는 ADMIN 계정으로 로그인 → `/ko/warehouse/pickup`에서 실제 UPS 오더에 "픽업 완료" 클릭 → 에러 없이 성공하고 상태가 SCHEDULED로 바뀌는지 스크린샷으로 확인. **이번 Task도 R-10 생략 시 반려 처리됩니다.**

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-245 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 951 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #951`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. **R-10 증적누락 5회 + vacuous test 4가지 메커니즘 누적** — 직전 TASK-B-244(PR#950)에서 vacuous 테스트로 반려된 뒤 재작업으로 통과한 이력 참고. 이번엔 처음부터 실제 payload/동작을 검증하는 테스트로 작성하고 R-10도 반드시 첨부할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
