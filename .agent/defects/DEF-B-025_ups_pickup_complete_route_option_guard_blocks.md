# DEF-B-025: UPS 오더 픽업완료가 route_option_id 가드에 막혀 100% 실패

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/ko/warehouse/pickup` 페이지를 Jaison이 직접 재현·근본원인 확인 |
| **긴급도** | High |
| **영향 범위** | `src/app/actions/operations/orders.ts`의 `updateOrderStatus()` — UPS + PICKUP 배송방식 오더 전부 |
| **관련 파일** | `src/app/actions/operations/orders.ts:393-402` |

## 현상 (실측 재현)

`/ko/warehouse/pickup` 페이지에서 오더(`ZEN-2026-000003`, UPS/PICKUP/REGISTERED)에 "픽업 완료" 클릭 → 확인 모달에서 재확인 → **"경로를 먼저 선택해야 일정 확정(SCHEDULED)이 가능합니다."** 에러로 실패. Playwright로 직접 재현·스크린샷 확인.

## 근본 원인

`updateOrderStatus()`의 REGISTERED→SCHEDULED 전이 가드:
```ts
if (currentOrder.status === OrderStatus.REGISTERED && nextStatus === OrderStatus.SCHEDULED) {
  const orderCheck = await supabase.from('zen_orders').select('route_option_id').eq('id', orderId).maybeSingle();
  const routeOptionId = orderCheck?.data?.route_option_id;
  if (!routeOptionId) {
    throw new Error('경로를 먼저 선택해야 일정 확정(SCHEDULED)이 가능합니다.');
  }
}
```
`route_option_id`는 AIR/SEA 등 항구 기반 다구간 운송의 "경로 선택" 엔진(`src/app/actions/operations/routing.ts`, `origin_port_id`/`dest_port_id` 기반 라우팅 계산)에서만 채워지는 값. UPS 오더는 이 라우팅 절차 자체를 거치지 않으므로 `route_option_id`가 항상 NULL.

`confirmPickup()`(`warehouse.ts:222`)이 호출하는 `getPickupOrders()`(`warehouse.ts:203`)는 애초에 `transport_mode = 'UPS'`인 오더만 대상으로 조회 — 즉 이 페이지에 뜨는 모든 오더가 구조적으로 이 가드에 걸려 **픽업완료가 항상 실패**함. 로컬 DB에 있는 유일한 대상 오더로 재현 확인(`route_option_id` NULL).

## JSJung 확정 사항

UPS 오더의 픽업은 Agency 직원이 화주의 화물을 직접 픽업하고 상태를 SCHEDULED로 전환하는 것으로, **route_option_id 정보 자체가 필요 없음** — UPS 오더에 대해 이 가드를 예외 처리해야 함.

## 조치안 (Jaison 확정 설계)

`updateOrderStatus()`의 가드 조건에 `currentOrder.transport_mode !== 'UPS'` 추가 — `currentOrder`는 이미 `getStatus()`(`select('status, transport_mode')`)로 조회되어 `transport_mode`를 포함하므로 추가 쿼리 불필요:

```ts
if (currentOrder.status === OrderStatus.REGISTERED && nextStatus === OrderStatus.SCHEDULED && currentOrder.transport_mode !== 'UPS') {
  ...
}
```

**참고**: `canChangeStatus()`(`status-machine.ts`) 확인 결과 AGENCY 역할은 이미 REGISTERED→SCHEDULED 전이가 허용되어 있음(`ROLE_PERMISSIONS[AGENCY]`에 `SCHEDULED` 포함) — 이 가드만 제거하면 됨, 별도 권한 변경 불필요.
