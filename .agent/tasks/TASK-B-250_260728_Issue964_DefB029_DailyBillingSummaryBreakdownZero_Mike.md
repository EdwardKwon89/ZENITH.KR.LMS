# TASK-B-250: Issue #964 / DEF-B-029 — daily-billing 요약 목록 기본운임/유류할증 등 항상 ₩0

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#964](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/964) |
| **DEF** | [DEF-B-029](../defects/DEF-B-029_daily_billing_summary_breakdown_always_zero.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-28 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

JSJung 요청으로 `/finance/daily-billing`을 Jaison이 직접 재현·근본원인 확인. 상세 내용은 DEF-B-029 참조.

원인: `getShipperDailyBillingSummary()`(`daily-billing.ts:203-236`)가 그룹 생성 시 `totalBaseFreight`/`totalFuelSurcharge`/`totalSurgeFee`/`totalOtherCharge`/`totalActualAdjustment` 5개 필드를 0으로 초기화만 하고, 이후 순회 루프에서 `totalBillingAmountKrw`(총 합계)만 갱신될 뿐 나머지 5개는 어디서도 증가하지 않습니다. 인보이스 조회 쿼리(`invoiceSelect`)도 비용 항목 데이터를 아예 조회하지 않습니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

핵심 아이디어: 인보이스마다 `metadata.source_order_id`(모든 티어 공통 필드, `invoice-generator.ts:93-95`/`144` 확인 완료)로 실제 오더를 특정한 뒤, 전체 오더의 `zen_order_costs`를 **한 번의 `.in()` 쿼리로 일괄 조회**해 cost_type별로 그룹에 누적합니다(TASK-B-248의 `getShipperDailyOrdersDetails()`가 쓰는 것과 동일한 패턴).

### `src/app/actions/finance/daily-billing.ts` — `getShipperDailyBillingSummary()` 수정

#### 1. `invoiceSelect`(121-125행)에 `metadata` 추가

```ts
const invoiceSelect = `
  id, invoice_no, total_amount, currency, status, is_finalized,
  billed_org_id, invoice_tier, created_at, metadata,
  org:billed_org_id ( id, name )
`;
```

#### 2. `if (invoices.length === 0) { ... }`(187-189행) 바로 다음, `groupsMap` 생성(191행) 이전에 비용 일괄 조회 블록 추가

```ts
const sourceOrderIds = [...new Set(
  invoices.map((inv: any) => inv.metadata?.source_order_id).filter(Boolean)
)] as string[];

const costsByOrderId = new Map<string, any[]>();
if (sourceOrderIds.length > 0) {
  const { data: allCosts } = await supabase
    .from('zen_order_costs')
    .select('order_id, cost_type, unit_price, quantity, total_amount, currency')
    .in('order_id', sourceOrderIds);

  for (const c of allCosts || []) {
    const list = costsByOrderId.get(c.order_id) || [];
    list.push(c);
    costsByOrderId.set(c.order_id, list);
  }
}
```

#### 3. 순회 루프 안(`group.totalBillingAmountKrw += amountKrw;` 바로 다음, 230행 이후)에 breakdown 누적 추가

```ts
const orderId = inv.metadata?.source_order_id;
const orderCosts = orderId ? (costsByOrderId.get(orderId) || []) : [];
for (const c of orderCosts) {
  const rawAmt = Number(c.total_amount || c.unit_price * (c.quantity || 1) || 0);
  const { amountKrw: costKrw, unsupported: costUnsupported } = convertToKrw(rawAmt, c.currency, exchangeRate);
  if (costUnsupported) group.hasUnsupportedCurrency = true;
  if (c.cost_type === 'FREIGHT' || c.cost_type === 'BASE_FREIGHT') group.totalBaseFreight += costKrw;
  else if (c.cost_type === 'FUEL_SURCHARGE') group.totalFuelSurcharge += costKrw;
  else if (c.cost_type === 'SURGE_EMERGENCY' || c.cost_type === 'SURGE_FEE') group.totalSurgeFee += costKrw;
  else if (c.cost_type === 'OTHER_CHARGE') group.totalOtherCharge += costKrw;
  else if (c.cost_type === 'UPS_ACTUAL_ADJUSTMENT') group.totalActualAdjustment += costKrw;
}
```

### 건드리지 않는 것 (범위 밖)

- `totalBillingAmountKrw`(인보이스 `total_amount` 기준 총 합계) — 이미 정확하므로 변경 없음. breakdown 5개 필드의 합이 반드시 `totalBillingAmountKrw`와 일치할 필요는 없음(설계상 총액은 인보이스 확정 금액, breakdown은 원가 항목별 참고 정보라는 기존 관례를 그대로 따름 — `getShipperDailyOrdersDetails()`도 동일 관례).
- `getShipperDailyOrdersDetails()`(상세 펼침) — 이미 정상 동작 중이라 변경 없음.
- 티어별 접근 권한 분기(ADMIN/AGENCY/SHIPPER) — 변경 없음.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-250-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 250 나와야 정상)
- [ ] 위 스펙대로 3개 블록 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain 금지):
  1. `zen_order_costs`에 BASE_FREIGHT/FUEL_SURCHARGE/SURGE_FEE/OTHER_CHARGE 각 항목이 있는 오더를 인보이스와 연결해 `getShipperDailyBillingSummary()` 호출 시 각 그룹의 `totalBaseFreight`/`totalFuelSurcharge`/`totalSurgeFee`/`totalOtherCharge`가 실제로 해당 금액(환율 적용 KRW)으로 채워지는지 실측(원래 코드로 되돌리면 전부 0으로 나오는 걸 재현 확인 — 이번 DEF의 핵심 회귀 테스트)
  2. `metadata.source_order_id`가 없는 인보이스(레거시 데이터 가정) 케이스에서 에러 없이 breakdown이 0으로 유지되는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬에서 ADMIN 계정으로 `/finance/daily-billing` 접속 → 요약 표의 기본운임/유류할증료/급증수수료/기타부과금 열이 ₩0이 아닌 실제 값으로 표시되는지 스크린샷으로 확인. AGENCY/SHIPPER 계정으로도 동일하게 정상 표시되는지 회귀 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-250 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 964 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #964`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. R-10 실구동 증적 누락이 7회 연속 반복된 이력이 있음(PR#909·915·939·947·950·954·956) — 이번엔 반드시 스크린샷 첨부할 것, 재차 생략 시 반려 처리됩니다. vacuous 테스트 이력(TASK-B-244)도 참고해 되돌리기 검증까지 직접 실행할 것.

## [작업 결과]

### 변경 내용

#### `src/app/actions/finance/daily-billing.ts`
- `invoiceSelect`에 `metadata` 필드 추가
- 인보이스별 `zen_order_costs` 일괄 조회 블록 신규 (`.in("order_id", sourceOrderIds)`)
- 순회 루프에 `cost_type`별 breakdown 누적 로직 추가 (BASE_FREIGHT/FUEL_SURCHARGE/SURGE_FEE/OTHER_CHARGE/UPS_ACTUAL_ADJUSTMENT)

### 테스트 (behavioral)
- `zen_order_costs`에 4개 항목이 있는 오더 → 각 breakdown 필드에 KRW 환산 금액 누적 검증
- `metadata.source_order_id` 없는 레거시 인보이스 → breakdown 0 유지 검증

### 검증
- **빌드**: ✅ PASS
- **테스트**: `daily-billing-aggregation.test.ts` 20/20 PASS
- **회귀**: 144/144 파일, 978/978 테스트 ALL PASS
- **커밋 해시**: `066cbda2`

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
