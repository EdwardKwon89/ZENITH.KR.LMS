# TASK-B-252: Issue #970 / DEF-B-031 — ADMIN_TO_AGENCY 청구서 할인율 미반영 + Agency 정산조회 매출/매입 정의 오류

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#970](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/970) |
| **DEF** | [DEF-B-031](../defects/DEF-B-031_agency_admin_invoice_no_discount_and_settlement_wrong_definition.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-29 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

JSJung 확인 요청("agency 입장에서 매입/매출 정의")을 Jaison이 코드로 분석하던 중 발견, JSJung이 실제 테스트 데이터(admin→agency 20%, agency→shipper 25% — 역마진 시나리오)로 재확인. 상세 내용은 DEF-B-031 참조. 두 가지 별개 버그가 하나의 근본원인(rate_snapshot 메타데이터를 실제 인보이스 대신 각자 재해석)에서 나옵니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/lib/finance/settlement/invoice-generator.ts` — ADMIN_TO_AGENCY 인보이스에 할인율 반영

현재(130-145행 부근):
```ts
const platformTotal = baseFreight + fuelSurcharge + surgeFee + otherCharges;
...
const { data: agencyInv, error: agencyInvError } = await supabase
  .from('zen_invoices')
  .insert({
    invoice_no: `INV-${today}-${randomSuffix()}`,
    shipper_id: shipperIdStr,
    billed_org_id: order.agency_org_id,
    invoice_tier: 'ADMIN_TO_AGENCY',
    total_amount: platformTotal,
    ...
```

아래로 교체 — `meta.agency?.agencyCostPrice`(오더 생성 시점에 이미 할인 적용되어 계산·저장된 원가)를 우선 사용, 없으면 기존 `platformTotal`로 폴백:
```ts
const agencyCostPrice = Number(meta.agency?.agencyCostPrice);
const agencyBilledTotal = Number.isFinite(agencyCostPrice) && agencyCostPrice > 0
  ? agencyCostPrice
  : platformTotal;
...
const { data: agencyInv, error: agencyInvError } = await supabase
  .from('zen_invoices')
  .insert({
    invoice_no: `INV-${today}-${randomSuffix()}`,
    shipper_id: shipperIdStr,
    billed_org_id: order.agency_org_id,
    invoice_tier: 'ADMIN_TO_AGENCY',
    total_amount: agencyBilledTotal,
    ...
```
(그 외 `metadata: { source_order_id, order_no, platform_breakdown }` 등 나머지 필드는 변경 없음 — `total_amount` 계산식만 교체)

**주의**: `meta`는 이미 이 함수 위쪽에서 `zen_order_rate_snapshots.metadata`로 조회된 변수를 그대로 사용(신규 조회 불필요) — 정확한 변수명은 실제 코드 확인 후 그대로 사용할 것.

### 2. `src/lib/actions/agency-settlement.ts` — 매출/매입을 실제 인보이스에서 조회하도록 재설계

핵심 아이디어: `_calculateOrderSettle()`(45-78행)가 `zen_order_rate_snapshots`를 재해석하는 대신, 대상 오더들의 `zen_invoices`를 한 번에 조회해 `metadata->>source_order_id`로 매핑한 뒤 **매출=AGENCY_TO_SHIPPER 인보이스 금액, 매입=ADMIN_TO_AGENCY 인보이스 금액**을 그대로 사용합니다.

#### 2-1. 신규 헬퍼 `_fetchOrderInvoiceTotals()` 추가

```ts
async function _fetchOrderInvoiceTotals(
  supabase: any,
  orderIds: string[]
): Promise<Record<string, { revenue: number; cost: number }>> {
  if (orderIds.length === 0) return {};
  const { data, error } = await supabase
    .from('zen_invoices')
    .select('invoice_tier, total_amount, metadata')
    .in('invoice_tier', ['AGENCY_TO_SHIPPER', 'ADMIN_TO_AGENCY'])
    .neq('status', 'CANCELED');
  if (error) throw error;

  const result: Record<string, { revenue: number; cost: number }> = {};
  for (const inv of (data || [])) {
    const orderId = inv.metadata?.source_order_id;
    if (!orderId || !orderIds.includes(orderId)) continue;
    if (!result[orderId]) result[orderId] = { revenue: 0, cost: 0 };
    if (inv.invoice_tier === 'AGENCY_TO_SHIPPER') result[orderId].revenue += Number(inv.total_amount || 0);
    else if (inv.invoice_tier === 'ADMIN_TO_AGENCY') result[orderId].cost += Number(inv.total_amount || 0);
  }
  return result;
}
```

**주의**: `.in('metadata->>source_order_id', orderIds)` 형태의 JSON path `.in()` 필터는 supabase-js에서 신뢰도가 낮아, 위처럼 **AGENCY_TO_SHIPPER/ADMIN_TO_AGENCY 전체를 조회 후 애플리케이션에서 orderIds로 필터링**하는 방식을 사용합니다(전체 인보이스 건수가 아직 많지 않아 성능 문제 없음 — 추후 건수가 많아지면 `.filter('metadata->>source_order_id', 'in', ...)`로 최적화 검토).

#### 2-2. `_calculateOrderSettle()` 교체

```ts
function _calculateOrderSettle(
  order: any,
  invoiceTotals: Record<string, { revenue: number; cost: number }>
): { revenue: number; cost: number; margin: number } {
  const totals = invoiceTotals[order.id];
  if (!totals) return { revenue: 0, cost: 0, margin: 0 };
  const { revenue, cost } = totals;
  return { revenue, cost, margin: Math.round((revenue - cost) * 100) / 100 };
}
```
(`policies`/`zoneMap` 매개변수 완전 제거 — 더 이상 필요 없음)

#### 2-3. 호출부 4곳 전부 수정 — `_fetchBaseData(supabase, targetAgencyId)` 호출을 `_fetchOrderInvoiceTotals(supabase, orderIds)`로 교체

`getAgencySettlementSummary`(102-121행), `getAgencyShipperSettlements`(151-176행), `getAgencyOrderSettlements`(232-256행), `exportAgencySettlementExcel`+`_mapToExcelRow`(330-403행) 4곳 전부:
- 각 함수의 `zen_orders` 쿼리에서 `snapshot:zen_order_rate_snapshots(...)` select 부분 삭제(더 이상 불필요 — `getAgencyOrderSettlements`의 `breakdown` 응답 필드는 유지해야 하면 별도로 스냅샷을 조회하되, 매출/매입 계산과는 분리)
- 쿼리 결과에서 `orderIds = (ordersRes.data || []).map((o:any) => o.id)` 추출 → `const invoiceTotals = await _fetchOrderInvoiceTotals(supabase, orderIds);` 호출
- `_calculateOrderSettle(order, policies, zoneMap)` → `_calculateOrderSettle(order, invoiceTotals)`로 교체
- `_fetchBaseData()` 함수 자체는 더 이상 이 4개 함수에서 호출되지 않게 됨(함수 정의는 삭제해도 되고, 다른 곳에서 안 쓰인다면 삭제 — grep으로 다른 사용처 없는지 확인 후 판단)

#### 2-4. `getAgencyOrderSettlements`의 `breakdown` 필드(275-280행)

이 필드는 상세 리스트에 "기본운임/유류할증/기타부가/급증수수료" 참고 표시용으로 남아있던 것 — 매출/매입 계산과는 무관하므로, **원한다면 그대로 유지**(별도로 `zen_order_rate_snapshots`를 조회해 `metadata.platform.breakdown`을 그대로 표시하는 용도로 남겨도 되고, 이번 Task 필수 범위는 아님). 단, 매출/매입/마진 계산 로직 자체는 반드시 위 2-1~2-3 스펙대로 인보이스 기반으로 교체해야 합니다.

### 건드리지 않는 것 (범위 밖)

- `zen_agency_pricing_policies`/`zen_agency_shipper_zone_discounts` 할인율 데이터값(20%→40% 등) 자체 변경 — 이건 코드 수정이 아니라 데이터 조정이라 Jaison이 별도로 직접 처리합니다. 이번 Task는 **코드가 할인율을 올바르게 반영/조회하도록 고치는 것까지만**입니다.
- `getAgencyUnpricedOrders()`(192-208행) — `getAgencyOrderSettlements()`를 그대로 재사용하므로 자동으로 함께 수정됨, 별도 작업 불필요.
- UPS 예상운임 계산 로직(`freight.ts`/`agency-pricing.ts`/`shipper-pricing.ts`) — 오더 생성 시점 `metadata.agency.agencyCostPrice` 계산 자체는 이미 정확하다고 확인됨(Jaison 분석), 변경 없음.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-252-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 252 나와야 정상)
- [ ] 위 스펙대로 `invoice-generator.ts` 1곳 + `agency-settlement.ts` 전면 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain 금지):
  1. `invoice-generator.ts`: agency 할인율이 등록된 오더에서 ADMIN_TO_AGENCY 인보이스의 `total_amount`가 `platformTotal`이 아니라 `agencyCostPrice`(할인 적용값)로 생성되는지 실측(원래 코드로 되돌리면 무할인 금액이 나오는 걸 재현 확인)
  2. `agency-settlement.ts`: 특정 오더에 AGENCY_TO_SHIPPER 인보이스(예: 100,000)와 ADMIN_TO_AGENCY 인보이스(예: 80,000)를 각각 fixture로 두고 `getAgencyOrderSettlements()` 호출 시 `revenue=100000, cost=80000, margin=20000`이 정확히 나오는지 실측(원래 코드로 되돌리면 다른 값이 나오는 걸 재현 확인)
  3. 인보이스가 아직 없는 오더(신규 등록 직후) 케이스에서 revenue/cost가 0으로 유지되는지 확인(에러 없이)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 `agency@zenith.kr` 계정으로 `/agency/settlements` 접속 → 매출/매입/마진이 실제 인보이스 금액과 일치하는지(예: ZEN-2026-000001~007 각 오더의 AGENCY_TO_SHIPPER/ADMIN_TO_AGENCY 인보이스 금액과 화면 표시값 비교) 스크린샷으로 확인. 오더 신규 등록 → 인보이스 발행 전/후 화면 변화도 함께 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-252 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 970 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #970`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. R-10 실구동 증적 누락 이력이 있음(직전 TASK-B-250에서는 JSJung 직접 검증으로 대체됐으나, 이번엔 명시적으로 필수 — 재무 계산의 핵심 수정이라 실제 화면 확인이 특히 중요합니다) — 반드시 스크린샷 첨부할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
