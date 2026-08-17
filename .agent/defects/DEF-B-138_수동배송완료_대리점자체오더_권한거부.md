# DEF-B-138: 수동 배송완료(DELIVERED) 전환 — 대리점 자체 오더 권한 거부

**발견일**: 2026-08-17
**발견자**: JSJung (실사용 확인)
**긴급도**: Medium

## 현상

UPS 오더 상세페이지의 "수동 배송완료 전환" 기능이, 대리점(AGENCY)이 관리하는 화주의 오더는 정상 처리되지만, **대리점 자신이 화주인 오더**(대리점 자체 오더)에 대해서는 "소속 대리점이 관리하는 화주의 오더만 상태를 전환할 수 있습니다" 오류로 거부됨.

## 원인

`manuallySetOrderDeliveredAction()`(`src/app/actions/operations/tracking.ts:396-414`)의 AGENCY 권한 검증이 `zen_agency_shippers`(대리점-화주 제휴 관계 테이블) 조회 결과에만 의존:

```ts
const { data: agencyLink } = await supabase
  .from('zen_agency_shippers')
  .select('id')
  .eq('agency_org_id', profile.org_id)
  .eq('shipper_org_id', order.shipper_id)
  .eq('is_active', true)
  .maybeSingle();

if (!agencyLink) {
  return { success: false, error: '소속 대리점이 관리하는 화주의 오더만 상태를 전환할 수 있습니다.' };
}
```

`zen_agency_shippers`는 대리점이 관리하는 **다른** 화주와의 제휴 관계만 담는 테이블이라, `order.shipper_id === profile.org_id`(대리점 자신이 화주)인 경우 자기 자신을 향한 제휴 행이 존재하지 않아 조회가 실패 → 오탐 거부.

`order.shipper_id === profile.org_id`(자기 소유 오더) 체크는 `order-services.ts`, `claims.ts` 등 다른 화면에서 이미 관례적으로 병행하고 있는데, 이 함수에만 누락됨.

## 영향 범위

`manuallySetOrderDeliveredAction()`을 사용하는 모든 대리점 자체 오더의 수동 배송완료 전환.

## 권장 조치

TASK-B-313으로 처리 — `order.shipper_id === profile.org_id`일 때는 `zen_agency_shippers` 조회를 건너뛰고 바로 허용.
