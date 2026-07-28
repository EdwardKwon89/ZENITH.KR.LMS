# TASK-B-248: Issue #958 / DEF-B-027 — 화주별 일별 청구 상세 펼침 ADMIN_TO_AGENCY 티어 수정

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#958](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/958) |
| **DEF** | [DEF-B-027](../defects/DEF-B-027_daily_billing_detail_expand_empty_for_admin_to_agency_tier.md) |
| **담당** | Baker (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P1 |
| **상태** | 🔔 |

## 개요

JSJung 요청으로 `/finance/daily-billing`을 Jaison이 직접 재현·근본원인 확인. `ADMIN_TO_AGENCY` 티어 인보이스 그룹(대리점에게 청구하는 인보이스)의 "상세" 펼침이 항상 빈 목록으로 나오는 버그를 발견했습니다. 상세 내용은 DEF-B-027 참조.

원인: `getShipperDailyOrdersDetails()`가 그룹의 `shipperId`(=인보이스 `billed_org_id`)로 `zen_orders.shipper_id`를 조회하는데, ADMIN_TO_AGENCY 티어는 `billed_org_id`가 **대리점 자신의 org_id**라 오더 조회가 항상 0건입니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

핵심 아이디어: "화주 org_id로 오더를 역추적"하는 방식을 버리고, **이미 정확한 `group.invoiceIds`로 인보이스를 먼저 조회 → 각 인보이스의 `metadata.source_order_id`(모든 티어 인보이스에 공통으로 저장됨, `src/lib/finance/settlement/invoice-generator.ts:93-95`/`144` 확인 완료)로 실제 오더를 역추적**하는 방식으로 전환합니다.

### 1. `src/app/actions/finance/daily-billing.ts` — `getShipperDailyOrdersDetails()` 전면 재작성

**함수 시그니처 변경**:
```ts
export async function getShipperDailyOrdersDetails(
  invoiceIds: string[],
  exchangeRate?: number
): Promise<{
  success: boolean;
  orders?: ShipperDailyOrderRow[];
  error?: string;
}>
```
(기존 `shipperId, dateOrPeriod, periodType` 파라미터 전부 제거 — `invoiceIds`가 이미 정확한 대상 집합이라 날짜/화주로 재검색할 필요 없음)

**함수 본문**:
```ts
try {
  const { supabase } = await validateUserAction();
  const rate = exchangeRate || await getNumericParam('EXCHANGE_RATE_USD_KRW', 1350);

  if (!invoiceIds || invoiceIds.length === 0) return { success: true, orders: [] };

  // 1. 인보이스 먼저 조회 — RLS(zen_invoices 기존 정책)가 role별 접근 범위를 자동으로 걸러줌
  const { data: invoices, error: invErr } = await supabase
    .from('zen_invoices')
    .select('id, invoice_no, status, is_finalized, metadata')
    .in('id', invoiceIds)
    .neq('status', 'CANCELED');

  if (invErr) throw new Error(`인보이스 조회 실패: ${invErr.message}`);
  if (!invoices || invoices.length === 0) return { success: true, orders: [] };

  // 2. metadata.source_order_id로 실제 오더 역추적 (모든 invoice_tier 공통 필드)
  const orderIds = [...new Set(
    invoices.map((inv) => inv.metadata?.source_order_id).filter(Boolean)
  )] as string[];

  if (orderIds.length === 0) return { success: true, orders: [] };

  const { data: orders, error: ordersErr } = await supabase
    .from('zen_orders')
    .select(`
      id, order_no, status, transport_mode, recipient_country_code, created_at,
      shipper_id, shipper:shipper_id ( name )
    `)
    .in('id', orderIds);

  if (ordersErr) throw new Error(`오더 상세 목록 조회 실패: ${ordersErr.message}`);
  if (!orders || orders.length === 0) return { success: true, orders: [] };

  const { data: costs } = await supabase
    .from('zen_order_costs')
    .select('order_id, cost_type, unit_price, quantity, total_amount, currency')
    .in('order_id', orderIds);

  const resultRows: ShipperDailyOrderRow[] = orders.map((o) => {
    const oCosts = (costs || []).filter((c) => c.order_id === o.id);
    let baseFreight = 0, fuelSurcharge = 0, surgeFee = 0, otherCharge = 0, actualAdj = 0;
    let orderUnsupported = false;

    for (const c of oCosts) {
      const rawAmt = Number(c.total_amount || c.unit_price * (c.quantity || 1) || 0);
      const { amountKrw, unsupported } = convertToKrw(rawAmt, c.currency, rate);
      if (unsupported) orderUnsupported = true;
      if (c.cost_type === 'FREIGHT' || c.cost_type === 'BASE_FREIGHT') baseFreight += amountKrw;
      else if (c.cost_type === 'FUEL_SURCHARGE') fuelSurcharge += amountKrw;
      else if (c.cost_type === 'SURGE_EMERGENCY' || c.cost_type === 'SURGE_FEE') surgeFee += amountKrw;
      else if (c.cost_type === 'OTHER_CHARGE') otherCharge += amountKrw;
      else if (c.cost_type === 'UPS_ACTUAL_ADJUSTMENT') actualAdj += amountKrw;
    }

    const matchingInv = invoices.find((inv) => inv.metadata?.source_order_id === o.id);

    return {
      orderId: o.id,
      orderNo: o.order_no,
      status: o.status,
      shippingDate: new Date(o.created_at).toISOString().split('T')[0],
      shipperId: o.shipper_id,
      shipperName: (o.shipper as any)?.name || '화주',
      destCountryCode: o.recipient_country_code || 'US',
      transportMode: o.transport_mode,
      isFinalized: !!matchingInv?.is_finalized,
      baseFreight, fuelSurcharge, surgeFee, otherCharge,
      actualAdjustment: actualAdj,
      totalAmountKrw: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
      invoiceId: matchingInv?.id,
      invoiceNo: matchingInv?.invoice_no,
      invoiceStatus: matchingInv?.status,
      hasUnsupportedCurrency: orderUnsupported,
    };
  });

  return { success: true, orders: resultRows };
} catch (err: any) {
  logger.error('getShipperDailyOrdersDetails failed:', err);
  return { success: false, error: err.message || '상세 내역 조회 실패' };
}
```

기존의 AGENCY role 수동 소속 검사 블록(`zen_agency_shippers` 조회 + `allowedIds.includes(shipperId)`)은 **완전히 삭제** — `zen_invoices` RLS 정책이 이미 동일한 접근 범위를 자동으로 강제하므로 중복 로직 불필요(직접 확인 완료: Admin 전체, Agency는 `billed_org_id=본인` 또는 `zen_agency_shippers`로 연결된 화주만, Shipper는 본인만 — `supabase`는 service role이 아닌 RLS 적용 클라이언트).

### 2. `getShipperDailyBillingSummary()` — 죽은 코드 정리

`ShipperDailyBillingGroup` 타입(9행 부근)에서 `orderIds: string[]` 필드 삭제, 그룹 생성부(218행 `orderIds: [],`)와 누적부(227행 `group.orderIds.push(inv.id);` — 이름은 orderIds인데 실제로는 invoice id가 들어가는 버그였음)도 함께 삭제. `invoiceIds`(정상 필드, 그대로 유지)만 사용합니다.

### 3. `src/components/finance/ShipperDailyBillingClient.tsx` — 호출부 수정

`toggleExpand()`(355행 부근)의 호출:
```ts
const res = await getShipperDailyOrdersDetails(group.shipperId, group.date, periodType);
```
을 아래로 교체:
```ts
const res = await getShipperDailyOrdersDetails(group.invoiceIds);
```

### 건드리지 않는 것 (범위 밖)

- `getShipperDailyBillingSummary()`의 그룹 집계 로직 자체(`shipperId: inv.billed_org_id` 등) — 요약 화면 표시는 정상 동작 중이라 변경 없음, 상세 조회 방식만 바꿈
- `zen_invoices` RLS 정책 — 변경 없음(이미 정확함)
- 일괄 마감(`finalizeDailyShipperInvoices`) 로직 — 무관

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-248-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 248 나와야 정상)
- [ ] 위 스펙대로 3개 파일 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain/그림자 컴포넌트 금지):
  1. ADMIN_TO_AGENCY 티어 인보이스(billed_org_id=대리점 org_id, metadata.source_order_id=실제 오더 id)로 `getShipperDailyOrdersDetails(invoiceIds)`를 호출했을 때 실제로 그 오더가 결과에 포함되는지 실측(원래 코드로 되돌리면 빈 배열이 되는 걸 재현 확인)
  2. AGENCY_TO_SHIPPER 티어 케이스도 정상 동작하는지 확인(회귀 없음)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 검증 주체 변경 (2026-07-28 Jaison 공지)**: 이번 Task의 R-10 스크린샷 검증은 **Baker가 아니라 JSJung이 직접 수행**합니다. Baker는 스크린샷 촬영/첨부를 생략하고, `[작업 결과]`에 "R-10 검증은 JSJung이 직접 수행 예정"이라고만 기재하면 됩니다.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Baker] fix: TASK-B-248 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 958 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #958`)

## 담당자 위반 이력 사전 경고

- Baker: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 원래 이 daily-billing 기능(TASK-B-237)을 만든 담당자라 구조는 익숙할 것 — vacuous test 이력(TASK-B-232) 참고해 실제 데이터 기반 검증 확실히 할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음

## [작업 결과]

| 항목 | 결과 |
|:-----|:-----|
| **커밋 해시** | `5652de25` |
| **브랜치** | `feature/teamb-248-daily-billing-admin-to-agency-fix` |
| **변경 파일** | `daily-billing.ts` · `ShipperDailyBillingClient.tsx` · `daily-billing-aggregation.test.ts` |
| **npm run test:regression** | 144/144 files · 976/976 tests ALL PASS |
| **R-10 스크린샷** | R-10 검증은 JSJung이 직접 수행 예정 |

### 변경 요약

1. **`getShipperDailyOrdersDetails()` 시그니처 단순화**: `(shipperId, dateOrPeriod, periodType, exchangeRate?, invoiceIds?)` → `(invoiceIds: string[], exchangeRate?)`. 기존 shipper_id 직접 조회 분기 완전 제거.
2. **AGENCY role 수동 검증 제거**: `zen_agency_shippers` 조회 + `allowedIds.includes()` 블록 삭제. RLS 정책이 이미 동일한 접근 범위를 강제.
3. **`orderIds` 죽은 필드 제거**: `ShipperDailyBillingGroup` 인터페이스에서 `orderIds: string[]` 삭제, summary에서 `orderIds: []` 초기화 + `group.orderIds.push(inv.id)` 삭제 (invoice ID를 order ID로 넣는 버그였음).
4. **클라이언트 호출부 갱신**: `toggleExpand()`에서 `getShipperDailyOrdersDetails(group.invoiceIds)` 호출.
5. **테스트 4건 갱신**: 시그니처 변경에 맞춰 테스트 전면 재작성. ADMIN_TO_AGENCY/AGENCY_TO_SHIPPER 티어 오더 역추적 behavioral 테스트 포함.
