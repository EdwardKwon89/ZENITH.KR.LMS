# TASK-B-253: Issue #972 / DEF-B-032 — daily-billing 상세 화면이 ADMIN_TO_AGENCY 그룹에서도 화주 청구(AGENCY_TO_SHIPPER) 금액을 표시

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#972](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/972) |
| **DEF** | [DEF-B-032](../defects/DEF-B-032_daily_billing_total_ignores_invoice_amount_shows_undiscounted_cost.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-29 |
| **우선순위** | P2 |
| **상태** | ⬜ |

## 개요

JSJung 요청으로 `/finance/daily-billing` 조회 정상 여부를 Jaison이 직접 확인하던 중 발견. **[2026-07-29 재분석]** 최초엔 "합계(KRW)만 틀리다"고 진단했으나, JSJung 재확인 결과 **기본운임/유류할증/급증수수료/기타부과금 개별 항목 자체도 admin↔agency가 아니라 화주↔대리점(AGENCY_TO_SHIPPER) 관계의 금액**임이 확인됨 — 아래 스펙은 이 재분석 내용으로 갱신됨. 상세 내용은 DEF-B-032 참조.

원인: `getShipperDailyOrdersDetails()`(`daily-billing.ts`)가 그룹의 인보이스 티어와 무관하게 **항상 `zen_order_costs` 하나만** 조회해서 breakdown과 "합계(KRW)"를 계산합니다. `zen_order_costs`는 화주 확정 청구(AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER) 전용 원장이라, ADMIN_TO_AGENCY 그룹에서 볼 때는 breakdown·합계 전부 다른 당사자의 숫자가 나옵니다.

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### `src/app/actions/finance/daily-billing.ts` — `getShipperDailyOrdersDetails()` 수정

#### 1. 인보이스 select에 `total_amount, currency, invoice_tier` 추가

현재:
```ts
const { data: invoices, error: invErr } = await supabase
  .from('zen_invoices')
  .select('id, invoice_no, status, is_finalized, metadata')
  .in('id', invoiceIds)
  .neq('status', 'CANCELED');
```
아래로 교체:
```ts
const { data: invoices, error: invErr } = await supabase
  .from('zen_invoices')
  .select('id, invoice_no, status, is_finalized, metadata, total_amount, currency, invoice_tier')
  .in('id', invoiceIds)
  .neq('status', 'CANCELED');
```

#### 2. 오더별 breakdown 계산에 ADMIN_TO_AGENCY 분기 추가

현재 각 오더 순회 블록(`orders.map((o: any) => { ... })` 안)에서 `zen_order_costs`(`oCosts`)로 baseFreight/fuelSurcharge/surgeFee/otherCharge를 채우는 로직 앞부분에, **먼저 `matchingInv`를 구하고 티어를 확인**하도록 순서를 조정합니다:

```ts
const matchingInv = invoices.find((inv: any) => inv.metadata?.source_order_id === o.id);

let baseFreight = 0, fuelSurcharge = 0, surgeFee = 0, otherCharge = 0, actualAdj = 0;
let orderUnsupported = false;

if (matchingInv?.invoice_tier === 'ADMIN_TO_AGENCY' && matchingInv.metadata?.platform_breakdown) {
  // admin→agency 그룹: zen_order_costs(화주 청구 전용 원장) 대신 인보이스에 저장된
  // UPS 정가 기준 platform_breakdown 사용 — 무할인 참고값이지만 최소한 올바른 당사자(admin↔agency)의 숫자
  const bd = matchingInv.metadata.platform_breakdown;
  baseFreight = Number(bd.baseFreight || 0);
  fuelSurcharge = Number(bd.fuelSurcharge || 0);
  surgeFee = Number(bd.surgeFee || 0);
  otherCharge = Number(bd.otherCharges || 0);
} else {
  // AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 그룹: 기존 방식(zen_order_costs) 그대로 유지 — 이미 정확
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
}
```
(`actualAdj`/`UPS_ACTUAL_ADJUSTMENT`는 ADMIN_TO_AGENCY 분기에는 해당 개념이 없으므로 0 유지 — `platform_breakdown`에는 사후조정 필드가 없음)

기존에 있던 `for (const c of oCosts) { ... }` 루프는 위 `else` 블록 안으로 이동하고, 기존 별도의 `const matchingInv = ...` 선언(현재 루프 이후에 있음)은 중복되지 않도록 위치만 앞으로 옮깁니다.

#### 3. `totalAmountKrw` 계산 교체

현재:
```ts
totalAmountKrw: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
```

아래로 교체:
```ts
const invoiceAmountKrw = matchingInv
  ? convertToKrw(Number(matchingInv.total_amount || 0), matchingInv.currency || 'USD', rate).amountKrw
  : baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj;
```
그리고 return 객체의 `totalAmountKrw` 필드를 `totalAmountKrw: invoiceAmountKrw,`로 교체. (`matchingInv`가 없는 경우 — 이론상 발생하지 않지만 방어적으로 — 기존 방식인 breakdown 합산으로 폴백)

### 건드리지 않는 것 (범위 밖)

- AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 그룹의 breakdown 계산 — `zen_order_costs` 기반으로 이미 정확, 변경 없음
- `platform_breakdown`을 할인 반영값으로 재계산하는 것 — DEF-B-033상 할인은 기본운임에만 적용되므로 정확한 할인 후 개별 항목을 보여주려면 추가 계산이 필요하나 이번 범위 밖. "무할인이라도 올바른 당사자의 숫자"로 바로잡는 것까지가 목표.
- `getShipperDailyBillingSummary()`(요약 표) — 이미 인보이스 `total_amount` 기준으로 정확함, 변경 없음.
- `ShipperDailyBillingClient.tsx`(UI 컴포넌트) — 필드명 변경 없이 그대로 사용 가능, 수정 불필요.

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-253-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 253 나와야 정상)
- [ ] 위 스펙대로 daily-billing.ts 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain 금지):
  1. ADMIN_TO_AGENCY 티어 인보이스(metadata.platform_breakdown 포함) fixture로 `getShipperDailyOrdersDetails()` 호출 시 baseFreight 등 breakdown이 `zen_order_costs`가 아니라 `platform_breakdown` 값으로 나오는지 실측 + `totalAmountKrw`가 인보이스 `total_amount` 기준인지 확인(원래 코드로 되돌리면 zen_order_costs 기반 다른 값이 나오는 걸 재현 확인 — 이번 DEF의 핵심 회귀 테스트)
  2. AGENCY_TO_SHIPPER 티어 케이스는 기존처럼 `zen_order_costs` 기반으로 정상 동작하는지 확인(회귀 없음)
  3. 인보이스가 없는(방어적 폴백) 케이스에서 기존처럼 breakdown 합산이 되는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬 ADMIN 계정으로 `/finance/daily-billing` → ADMIN_TO_AGENCY 그룹 "상세" 펼침 → 각 오더의 기본운임/유류할증/급증수수료/기타부과금·"합계(KRW)"가 실제 ADMIN_TO_AGENCY 인보이스 금액·platform_breakdown과 일치하는지 스크린샷으로 확인. AGENCY_TO_SHIPPER 그룹도 기존처럼 정상 표시되는지 함께 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-253 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 972 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #972`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 직전 TASK-B-252(PR#971)에서 핵심 fix 부분(invoice-generator.ts)에 대한 테스트가 누락된 이력이 있음 — 이번엔 위 회귀 테스트 항목(특히 되돌리기 검증)을 반드시 실제로 수행할 것.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
