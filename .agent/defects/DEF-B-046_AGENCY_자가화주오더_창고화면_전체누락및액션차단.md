# DEF-B-046 (Critical) — AGENCY가 본인을 화주로 등록한 오더가 창고 화면 전체에서 누락되고 액션(출고/UPS등록/발송 확정)이 차단됨

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung — `/warehouse/ups-receive`에서 조회 안 됨(MASTER AIR로 로그인, ZEN-2026-000008 미표시) |
| **긴급도** | **Critical** — 조회 누락뿐 아니라 출고/UPS등록/발송 확정 등 실제 워크플로우 액션이 하드 에러로 차단됨 |
| **현재 상태** | 미수정 |

## 근본 원인 (확정)

`src/app/actions/operations/warehouse.ts:20-32`의 `getAgencyShipperIds(supabase, orgId)`:
```ts
async function getAgencyShipperIds(supabase: any, orgId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("zen_agency_shippers")
    .select("shipper_org_id")
    .eq("agency_org_id", orgId)
    .eq("is_active", true);
  ...
  return (data || []).map((r: any) => r.shipper_org_id);
}
```
`zen_agency_shippers`에 **등록된 하위 화주**의 org_id만 반환 — 대리점 자기 자신의 org_id는 절대 포함되지 않음.

이 함수가 파일 내 **11개 함수**에서 동일 패턴(`if (profile.role === 'AGENCY') { shipperIds = getAgencyShipperIds(...); ... shipperIds.includes(shipperId) ... }`)으로 호출되는데, `zen_orders.shipper_id`가 **대리점 본인의 org_id**로 설정된 오더(대리점이 직접 화주로 오더 등록 — 실제 지원되는 정상 시나리오, `ZEN-2026-000008` 실측 확인)는 이 조건을 절대 통과 못함.

**실측**: MASTER AIR(AGENCY) 계정, `zen_agency_shippers`에 하위 화주 0건 등록 상태. `ZEN-2026-000008`의 `shipper_id`는 MASTER AIR 자기 자신의 org_id. `getWarehousedOrders()` 호출 시 `shipperIds = []` → 조기 반환으로 빈 배열, 화면에 아무것도 안 뜸.

## 영향 범위 (`warehouse.ts` 11개 함수 — 전부 동일 패턴)

| 함수 | 성격 | 영향 |
|:-----|:-----|:-----|
| `getWarehousedOrders` | 조회 | `/warehouse/ups-receive` 목록 누락 |
| `getTodayReleasedOrders` | 조회 | 오늘 출고 이력 누락 |
| `confirmOutbound` | **액션(하드 차단)** | "본인 소속 화주의 오더만 출고 처리할 수 있습니다" 에러 — 출고확정 불가 |
| `getPickupOrders` | 조회 | 픽업 대상 목록 누락 |
| `getTodayUpsHistory` | 조회 | `/warehouse/ups-receive` 오늘 UPS 등록 이력 누락(이번 신고 화면) |
| `getTodayDepartureHistory` | 조회 | 오늘 발송 이력 누락 |
| `getPackedOrders` | 조회 | 포장완료 목록 누락 |
| `confirmUpsRegistration` | **액션(하드 차단)** | UPS 등록확정 불가 |
| `getReleasedOrders` | 조회 | 출고 목록 누락 |
| `confirmDeparture` | **액션(하드 차단)** | 발송확정 불가 |
| `undoDeparture` | **액션(하드 차단)** | 발송확정 취소 불가 |

→ **대리점이 자기 자신을 화주로 등록한 UPS 오더는 창고 워크플로우 전 구간(입고 이후 전체)이 사실상 진행 불가능한 상태.**

## 수정 방향 (단일 지점 수정으로 11곳 전부 해결)

`getAgencyShipperIds()` **한 함수만** 수정 — 반환값에 대리점 본인 org_id를 포함시키면 11개 호출부 전부 코드 변경 없이 자동 해결:
```ts
async function getAgencyShipperIds(supabase: any, orgId: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("zen_agency_shippers")
    .select("shipper_org_id")
    .eq("agency_org_id", orgId)
    .eq("is_active", true);

  if (error) {
    logger.error("getAgencyShipperIds error:", error);
    return null;
  }
  const downstreamIds = (data || []).map((r: any) => r.shipper_org_id);
  return [...downstreamIds, orgId];   // 대리점 본인도 "관리 가능한 shipper_id"에 포함
}
```
- 함수명이 이제 의미와 약간 안 맞을 수 있어(`getAgencyShipperIds` → 실질적으로 "이 대리점이 오더를 관리할 수 있는 shipper_id 전체") 이름 변경도 고려 가능(선택 사항, 구현자 판단 — 변경 시 11개 호출부 전부 rename 필요하니 최소 침습 원한다면 이름 유지도 무방).
- `getWarehousedOrders`/`getTodayUpsHistory` 등의 `if (!shipperIds || shipperIds.length === 0) return []` 조기 반환 분기는 이제 사실상 도달 불가(항상 최소 1개, 본인 org_id)이지만 그대로 둬도 무해 — 굳이 제거 불필요.

## ⚠️ 범위 밖 — 동일 패턴이 다른 파일에도 존재할 가능성 (구현자 범위 밖, 별도 조사 필요)

`grep`으로 확인한 결과 `zen_agency_shippers` 조회 패턴이 아래 12개 파일에도 각각 독립적으로 존재함(이번 Task 범위 아님, IMP로 별도 기록):
```
agency/zone-discounts.ts, agency/shipper-link.ts, agency/shippers.ts,
operations/bulk-orders.ts, operations/orders.ts, operations/tracking.ts,
finance/shipper-invoices.ts, finance/daily-billing.ts, finance/settlement.ts,
finance/ups-actual-charges.ts, finance/order-revenue-cost.ts
```
이 중 일부는 성격상 "하위 화주 전용" 로직이 맞을 수도 있음(예: `zone-discounts.ts`는 대리점이 하위 화주에게 부여하는 할인율 관리라 자기 자신 포함이 의미 없을 수 있음) — 파일별로 자기 자신 포함이 맞는지 여부가 다를 수 있어 **일괄 적용 금지**, 개별 검토 필요. 이번 Task는 `warehouse.ts`만 수정하고, 나머지는 `scratch/post_launch_improvements.md`에 IMP로 별도 기록해 추후 개별 조사.

## 회귀 테스트 (필수)

- `getWarehousedOrders()`: AGENCY 프로필 + 오더의 `shipper_id`가 AGENCY 본인 org_id인 케이스 → 결과에 포함되는지 확인(behavioral, 실제 함수 호출)
- `confirmOutbound()`: 위와 동일 조건에서 에러 없이 성공하는지 확인
- 기존 하위 화주(`zen_agency_shippers` 등록) 케이스는 계속 정상 동작하는지 회귀 확인
- 타 조직(관계 없는 shipper_id)은 여전히 차단되는지 회귀 확인(보안 유지 검증 — 이번 수정이 권한을 과도하게 넓히지 않는지)
- **되돌리기 검증 필수** — `getAgencyShipperIds` 수정 제거 시 자가화주 오더가 다시 누락/차단되는지 확인
- 가능하면 11개 함수 중 최소 3~4개(조회 1건 + 액션 1건 이상) 대표 케이스로 회귀 테스트 작성, 전부 작성이 부담되면 나머지는 `getAgencyShipperIds()` 단위 테스트로 커버(단일 지점 수정이므로 이 함수 자체의 테스트가 가장 효율적)
