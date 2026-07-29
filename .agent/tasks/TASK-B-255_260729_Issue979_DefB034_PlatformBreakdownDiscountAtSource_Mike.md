# TASK-B-255: Issue #979 / DEF-B-034 — ADMIN_TO_AGENCY 인보이스 platform_breakdown을 할인 반영값으로 저장 + 요약 표도 이 값 사용

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#979](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/979) |
| **DEF** | [DEF-B-034](../defects/DEF-B-034_invoice_generator_platform_breakdown_stores_undiscounted_values.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-29 |
| **우선순위** | P2 |
| **상태** | 🔔 |

## 개요

JSJung 요청으로 daily-billing 요약/상세 breakdown 정합성을 Jaison이 재확인하던 중 발견. **JSJung 명시 지시: 화면단에서 "합계 − 부가운임"처럼 역산해서 맞추지 말고, 저장 시점(인보이스 생성) 로직 자체를 고쳐서 화면은 저장된 값을 그대로 읽기만 하면 되도록 할 것.** 상세 내용은 DEF-B-034 참조.

DEF-B-032(PR#976, 병합 완료)로 상세 펼침의 breakdown party(누구의 금액인가)는 정확해졌으나, 개별 항목 자체(기본운임 등)가 여전히 무할인 UPS 정가라 "합계"(할인 반영된 실제 청구액)와 세부 항목 합계가 일치하지 않습니다. 요약 표는 이 party 수정조차 아직 안 되어 있습니다(`zen_order_costs` 기반 그대로).

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/lib/finance/settlement/invoice-generator.ts` — `platform_breakdown`을 할인 반영값으로 저장

현재(130-148행 부근):
```ts
const platform = meta.platform || {};
const agencyCurrency = platform.currency || 'USD';
const baseFreight = Number(platform.baseSellingPrice) || 0;
const fuelSurcharge = Number(platform.fuelSurchargeSellingAmount) || 0;
const surgeFee = Number(platform.surgeFeeSellingAmount) || 0;
const otherCharges = Number(platform.otherChargesSellingTotal) || 0;
const platformTotal = baseFreight + fuelSurcharge + surgeFee + otherCharges;

const agencyCostPrice = Number(meta.agency?.agencyCostPrice);
const agencyBilledTotal = Number.isFinite(agencyCostPrice) && agencyCostPrice > 0
  ? agencyCostPrice
  : platformTotal;

...
metadata: {
  source_order_id: orderId,
  order_no: order.order_no,
  platform_breakdown: { baseFreight, fuelSurcharge, surgeFee, otherCharges },
},
```

아래로 교체 — `meta.agency`에 DEF-B-033 이후 계산된 할인 반영 breakdown이 있으면 그걸 사용, 없으면(구버전 rate_snapshot) 기존 `platform.*` 무할인값으로 폴백:

```ts
const platform = meta.platform || {};
const agencyCurrency = platform.currency || 'USD';
const platformBaseFreight = Number(platform.baseSellingPrice) || 0;
const platformFuelSurcharge = Number(platform.fuelSurchargeSellingAmount) || 0;
const platformSurgeFee = Number(platform.surgeFeeSellingAmount) || 0;
const platformOtherCharges = Number(platform.otherChargesSellingTotal) || 0;
const platformTotal = platformBaseFreight + platformFuelSurcharge + platformSurgeFee + platformOtherCharges;

const agencyMeta = meta.agency || {};
const agencyCostPrice = Number(agencyMeta.agencyCostPrice);
const hasDiscountedBreakdown = typeof agencyMeta.baseSellingPrice === 'number';

// 할인 반영된 breakdown(DEF-B-033 이후 계산분) 우선 사용 — 없으면(구버전 rate_snapshot) 무할인 platform 값 폴백
const baseFreight = hasDiscountedBreakdown ? Number(agencyMeta.baseSellingPrice) || 0 : platformBaseFreight;
const fuelSurcharge = hasDiscountedBreakdown ? Number(agencyMeta.fuelSurchargeSellingAmount) || 0 : platformFuelSurcharge;
const surgeFee = hasDiscountedBreakdown ? Number(agencyMeta.surgeFeeSellingAmount) || 0 : platformSurgeFee;
const otherCharges = hasDiscountedBreakdown ? Number(agencyMeta.otherChargesSellingTotal) || 0 : platformOtherCharges;

const agencyBilledTotal = Number.isFinite(agencyCostPrice) && agencyCostPrice > 0
  ? agencyCostPrice
  : platformTotal;

...
metadata: {
  source_order_id: orderId,
  order_no: order.order_no,
  platform_breakdown: { baseFreight, fuelSurcharge, surgeFee, otherCharges },
},
```
(`total_amount: agencyBilledTotal` 부분은 기존 그대로 — 변경 없음. `platform_breakdown` 필드 저장값만 위 4개 변수로 교체)

### 2. `src/app/actions/finance/daily-billing.ts` — `getShipperDailyBillingSummary()`에 ADMIN_TO_AGENCY 분기 추가

DEF-B-032(PR#976)가 `getShipperDailyOrdersDetails()`에 적용한 것과 동일한 패턴을 요약 함수의 인보이스 순회 루프에 적용합니다.

현재(`invoiceSelect`에 이미 `invoice_tier, metadata` 포함되어 있음 — 별도 select 수정 불필요), 순회 루프 안 breakdown 누적 부분:
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

아래로 교체:
```ts
if (inv.invoice_tier === 'ADMIN_TO_AGENCY' && inv.metadata?.platform_breakdown) {
  // admin→agency 그룹: zen_order_costs(화주 청구 전용 원장) 대신 인보이스에 저장된
  // 할인 반영 platform_breakdown 사용(DEF-B-034 수정 후 이미 할인 적용된 값)
  const bd = inv.metadata.platform_breakdown;
  const { amountKrw: baseKrw } = convertToKrw(Number(bd.baseFreight || 0), inv.currency || 'USD', exchangeRate);
  const { amountKrw: fuelKrw } = convertToKrw(Number(bd.fuelSurcharge || 0), inv.currency || 'USD', exchangeRate);
  const { amountKrw: surgeKrw } = convertToKrw(Number(bd.surgeFee || 0), inv.currency || 'USD', exchangeRate);
  const { amountKrw: otherKrw } = convertToKrw(Number(bd.otherCharges || 0), inv.currency || 'USD', exchangeRate);
  group.totalBaseFreight += baseKrw;
  group.totalFuelSurcharge += fuelKrw;
  group.totalSurgeFee += surgeKrw;
  group.totalOtherCharge += otherKrw;
} else {
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
}
```
(참고: `invoice_tier`가 `invoiceSelect`에 이미 포함되어 있는지 재확인 필요 — 없다면 `invoiceSelect` 문자열에 `invoice_tier` 추가할 것. `metadata`는 이미 포함되어 있음(DEF-B-029 수정 시 추가됨))

### 건드리지 않는 것 (범위 밖)

- `getShipperDailyOrdersDetails()`(상세 펼침) — DEF-B-032(PR#976)에서 이미 동일 패턴으로 수정 완료, 변경 없음. 단, `invoice-generator.ts` 수정으로 `platform_breakdown` 자체가 할인 반영값으로 바뀌므로, 이 함수는 코드 수정 없이도 자동으로 정확한 값을 표시하게 됨.
- `computeAgencyFreight()`/`estimateUpsFreight()`(오더 생성 시점 계산) — 이미 정확함(DEF-B-033), 변경 없음.
- 기존 오더(ZEN-2026-000001~007)의 `zen_order_rate_snapshots`/인보이스 데이터 정정 — 코드 병합 확인 후 Jaison이 직접 처리(운영 데이터 조정).

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-255-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 255 나와야 정상)
- [ ] 위 스펙대로 `invoice-generator.ts` + `daily-billing.ts` 2개 파일 수정
- [ ] 회귀 테스트 추가 — **반드시 실제 함수 호출 기반 behavioral 테스트**(toContain 금지):
  1. `invoice-generator.ts`: `meta.agency`에 할인 반영 breakdown(`baseSellingPrice` 등)이 있는 rate_snapshot으로 `generateInvoice()` 호출 시 `platform_breakdown`이 할인된 값으로 저장되는지 실측(원래 코드로 되돌리면 무할인 `platform.*` 값이 저장되는 걸 재현 확인)
  2. 구버전 rate_snapshot(`meta.agency`에 `baseSellingPrice` 없음, 기존 필드만 존재) fixture로 호출 시 기존처럼 `platform.*` 무할인 값으로 폴백되는지 확인(하위호환)
  3. `getShipperDailyBillingSummary()`: ADMIN_TO_AGENCY 인보이스의 `platform_breakdown`(할인 반영값) 기준으로 그룹 breakdown이 채워지는지 실측(되돌리기 검증 포함) + AGENCY_TO_SHIPPER 케이스는 기존 `zen_order_costs` 방식 그대로 회귀 없는지 확인
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재
- [ ] **R-10 필수**: 로컬 ADMIN 계정으로 `/finance/daily-billing` 접속 → ADMIN_TO_AGENCY 그룹의 요약 표 "총액"과 기본운임+유류할증+급증수수료+기타부과금 합계가 정확히 일치하는지, 상세 펼침도 마찬가지인지 스크린샷으로 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-255 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 979 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #979`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 직전 TASK-B-252(PR#971)에서 핵심 fix 부분 테스트가 누락된 이력이 있음(PR#974/#976에서는 정상 수행) — 이번에도 되돌리기 검증을 반드시 실제로 수행할 것.

## [작업 결과]

### 변경 내용

#### `src/lib/finance/settlement/invoice-generator.ts`
- `platform_breakdown`을 `meta.agency`에 할인 반영된 breakdown이 있으면 사용, 없으면 기존 `platform.*` 무할인 값으로 폴백

#### `src/app/actions/finance/daily-billing.ts`
- `getShipperDailyBillingSummary()`에 ADMIN_TO_AGENCY 분기 추가
- ADMIN_TO_AGENCY 인보이스는 `metadata.platform_breakdown` 기반으로 breakdown 표시

### 테스트 (behavioral)
- ADMIN_TO_AGENCY 인보이스: platform_breakdown 기반 breakdown 검증

### 검증
- **빌드**: ✅ PASS
- **테스트**: 144/144 파일, 982/982 테스트 ALL PASS
- **커밋 해시**: `0398be45`

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
