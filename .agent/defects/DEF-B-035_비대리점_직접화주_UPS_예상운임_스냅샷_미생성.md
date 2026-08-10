# DEF-B-035: 비대리점 직접 화주(SHIPPER/CORPORATE/INDIVIDUAL)의 UPS 오더는 예상운임 스냅샷·매입/매출·인보이스가 전부 생성되지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-09 |
| **발견자** | Jaison (JSJung 질문 "admin의 경우 매입, 매출이 산정되고 있나요?" 검증 중) |
| **긴급도** | Critical |
| **관련 IMP** | [IMP-157](../../scratch/post_launch_improvements.md) (기존 서술을 이번에 정정·확대) |
| **관련 파일** | `src/app/actions/operations/orders.ts:121-148`, `src/lib/finance/settlement/settlement.ts:71-73`, `src/app/actions/finance/order-revenue-cost.ts` |

## 발견 경위

Agency 오더는 오더별 매입/매출이 정상 산정되는데 Admin(대리점 미개입 직접 오더)도 동일하게 산정되는지 확인해달라는 요청에 따라 `order-revenue-cost.ts`부터 역추적. 계산 로직 자체(`snapshotMeta.platform.totalCostPrice`/`totalSellingPrice` 참조)는 정상이었으나, 그 원천인 `zen_order_rate_snapshots`가 애초에 생성되는 조건을 확인하다 `orders.ts:146`에서 근본 원인 발견.

## 현상

```ts
// src/app/actions/operations/orders.ts:146
if (profile.role === USER_ROLES.AGENCY_SHIPPER && validated.ups_product_code) {
  await saveOrderRateSnapshot({ supabase, orderId, validated, profile, agencyOrgId: resolvedAgencyOrgId, estimateFn: estimateUpsFreightFn });
}
```

오더 등록자의 `profile.role`이 정확히 `AGENCY_SHIPPER`일 때만 `zen_order_rate_snapshots`가 생성된다. 이 조건을 만족하지 못하는 **모든 경우**(대리점과 무관한 순수 직접 화주 SHIPPER/CORPORATE/INDIVIDUAL 등)는 오더 등록 시점에 스냅샷이 전혀 생성되지 않는다.

## 영향 범위

스냅샷이 없으면 연쇄적으로 다음이 전부 실패한다:

1. `SettlementEngine.calculateOrderCosts()`(UPS 분기, `settlement.ts:71-73`)가 `snapshot.metadata`를 조회해 없으면 즉시 `"예상운임 스냅샷이 없습니다 — UPS 오더 등록 시 저장 실패 또는 결함 A(recipient_country_code) 미수정 오더입니다."` 에러 반환 → `zen_order_costs`(매출 원장) 생성 불가.
2. `InvoiceGenerator.generateInvoice()`가 `order.costs`가 비어 있으면 위 엔진을 재호출하므로 동일하게 실패 → **해당 오더는 인보이스 발행 자체가 불가능**.
3. `order-revenue-cost.ts`의 ADMIN 매입(`snapshotMeta.platform.totalCostPrice`)·매출 폴백(`snapshotMeta.platform.totalSellingPrice`)이 전부 이 스냅샷을 읽으므로, 매입/매출 화면에서도 완전히 공백/0으로 표시.
4. `ups-detail` 화면의 예상운임 표시도 전부 공란.

**유일한 우회 경로**: 창고 입고 시 담당자가 실측 치수를 수정하면(`applyPackageMeasurements`, 이 경로는 role 게이트 없음) 그 시점에 스냅샷이 뒤늦게 생성된다. 그러나 이는 담당자가 실제로 치수를 재입력했을 때만 발동하는 조건부 경로이며, 원래 신고 치수를 그대로 신뢰하고 넘어가면 끝까지 스냅샷이 생기지 않는다.

## 재현/검증

- `USER_ROLES` 정의 확인(`src/lib/auth/rbac.ts:8-23`) — `SHIPPER`/`CORPORATE`/`INDIVIDUAL`은 `AGENCY_SHIPPER`와 별개의 독립 role.
- 현재 로컬 DB의 UPS 오더 8건 전수 조회 결과 전부 `agency_org_id`가 존재(대리점 소속) — 비대리점 직접 오더가 하나도 없어 이 경로가 실환경에서 검증된 적이 없음.
  ```sql
  SELECT order_no, agency_org_id IS NOT NULL AS has_agency FROM zen_orders WHERE transport_mode='UPS';
  -- 8건 전부 has_agency = t
  ```
- 코드 추적으로 근본 원인 확정(위 "현상" 인용).

## 권장 조치

`createOrder()`의 두 조건문에서 `profile.role === 'AGENCY_SHIPPER'` 게이트 제거:
- `agency_org_id` 설정은 `zen_agency_shippers`에 `shipper_org_id = profile.org_id`인 활성 행이 있는지로 판단(IMP-157의 기존 제안과 동일).
- 예상운임 스냅샷 생성(`saveOrderRateSnapshot`)은 **role/대리점 소속 여부와 무관하게 UPS 오더면 항상 호출**. `estimateUpsFreight`는 `agencyOrgId`가 없으면 이미 `{agency: null, shipper: null}`을 정상 반환하도록 설계되어 있어 안전.

## 참고

TASK-B-258로 배정. 상세 지시사항은 해당 task file 참조.
