# DEF-B-141: 출고확정 시 대리점 자가화주(셀프) 오더 인보이스 생성 실패 — 청구 집계 화면 누락

**발견일**: 2026-08-17
**발견자**: JSJung (admin@zenith.kr에서 ZEN-2026-000008 오더가 "화주별 일별 청구 집계 내역"에 조회 안 됨을 확인) → Jaison 원인 분석
**긴급도**: High

## 현상

Master Air(대리점, AGENCY, org_id=`0275c68a-702e-4812-95f8-9ac7834003cb`)가 **자기 자신을 화주로** 등록한 ZEN-2026-000008 오더를 출고확정(RELEASED)까지 정상 처리했으나, admin@zenith.kr로 "화주별 일별 청구 집계 내역"(`/finance/daily-billing`) 화면을 조회해도 해당 오더가 어떤 조건으로도 나타나지 않음.

## 원인

`src/app/actions/finance/settlement.ts`의 `generateInvoicesForOrder()`(L14-35):

```ts
if (profile.role === USER_ROLES.AGENCY) {
  const agencyShipperIds = await resolveAgencyShipperIds(supabase, profile.org_id!);
  const { data: order } = await supabase
    .from('zen_orders')
    .select('shipper_id')
    .eq('id', orderId)
    .single();

  if (!order || !agencyShipperIds.includes(order.shipper_id)) {
    throw new Error('본인 소속 화주의 오더에 대해서만 인보이스를 생성할 수 있습니다.');
  }
}
```

`resolveAgencyShipperIds()`(L422-429)는 `zen_agency_shippers` 테이블에서 **하위 화주 링크만** 조회하며 대리점 자기 자신의 org_id는 절대 포함하지 않음:

```ts
async function resolveAgencyShipperIds(supabase: any, agencyOrgId: string): Promise<string[]> {
  const { data } = await supabase
    .from('zen_agency_shippers')
    .select('shipper_org_id')
    .eq('agency_org_id', agencyOrgId)
    .eq('is_active', true);
  return (data || []).map((r: any) => r.shipper_org_id);
}
```

ZEN-2026-000008은 `shipper_id` = Master Air 자신의 org_id(셀프 오더)이므로 위 목록에 없어 검증 실패 → 예외 발생.

**증상이 조용히 묻히는 이유**: `updateOrderStatus()`(`src/app/actions/operations/orders.ts:539-542`)가 RELEASED 전이 시 `generateInvoicesForOrder()`를 fire-and-forget으로 호출하며 실패를 `.catch()`로 삼키고 로그만 남김:

```ts
nextStatus === OrderStatus.RELEASED
  ? generateInvoicesForOrder(orderId).catch(financeError => {
      logger.error("[CRITICAL] Finance automation failed during release:", financeError);
    })
  : Promise.resolve(),
```

서버 로그(2026-08-17 05:23:17.660Z) 확인:
```
[CRITICAL] Finance automation failed during release: Error: 본인 소속 화주의 오더에 대해서만 인보이스를 생성할 수 있습니다.
    at generateInvoicesForOrder ...
    at async confirmOutbound (warehouse.ts) ...
```

오더 상태 전이(RELEASED) 자체는 정상 성공하므로 사용자는 아무 오류도 보지 못하고, 그 결과 이 오더에 대한 `zen_invoices` 행이 영구히 생성되지 않음.

`getShipperDailyBillingSummary()`(`src/app/actions/finance/daily-billing.ts:109~`)는 `zen_invoices` 테이블만을 근거로 집계 그룹을 구성하므로, 인보이스 자체가 없는 이 오더는 ADMIN/AGENCY/SHIPPER 어느 역할·어느 기간으로 조회해도 나타날 수 없음.

## 영향 범위

- **직접 영향**: 대리점이 자기 자신을 화주로 등록한 모든 오더의 자동 인보이스 생성이 출고확정 시점에 항상 실패 → 정산/청구 집계에서 영구 누락(재시도 경로 없음, 수동 개입 필요)
- **동일 패턴 확인**: 같은 파일의 `assertFinalizePermission()`(L74-90)도 동일한 `resolveAgencyShipperIds()` 기반 검증을 사용 — 만약 셀프 오더의 인보이스가 어떤 경로로든 생성된다 해도, 정산 마감(finalize) 시도 시에도 동일하게 권한 거부될 것으로 예상(직접 재현은 안 함, 코드 리딩 기반)
- **선행 기록**: IMP-162(`scratch/post_launch_improvements.md`)에서 `zen_agency_shippers` 기반 필터가 "대리점 자가화주" 케이스를 놓치는 동일 패턴이 `finance/settlement.ts`를 포함한 12개 파일에 산재할 가능성이 있다고 예측했으나 개별 검증 미실시 상태였음 — 이번 건으로 **`finance/settlement.ts`에서 실제 버그로 확정**됨. `warehouse.ts`(DEF-B-046)·`tracking.ts`(TASK-B-313)와 동일 계열.

## 권장 조치

TASK-B-316으로 처리 — `resolveAgencyShipperIds()`가 대리점 자기 자신의 org_id도 포함하도록 수정(`warehouse.ts`의 `getAgencyShipperIds()` 수정 패턴과 동일: `[...downstreamIds, agencyOrgId]`), `generateInvoicesForOrder()`와 `assertFinalizePermission()` 양쪽 모두 검증. 이미 실패해 인보이스가 누락된 기존 오더(ZEN-2026-000008 등)에 대한 수동 인보이스 생성/백필 방안도 함께 검토.
