# TASK-B-254: Issue #973 / DEF-B-033 — Admin→Agency 할인율을 기본운임에만 적용하도록 변경

| 항목 | 내용 |
|:-----|:------|
| **Issue** | [#973](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/973) |
| **DEF** | [DEF-B-033](../defects/DEF-B-033_agency_discount_applies_to_whole_platform_total_not_base_freight_only.md) |
| **담당** | Mike (Team B) |
| **생성일** | 2026-07-29 |
| **우선순위** | P1 |
| **상태** | ⬜ |

## 개요

JSJung 확인 지시("할인은 기본운임에만 적용")를 Jaison이 코드로 재분석하던 중 발견. 상세 내용은 DEF-B-033 참조.

`computeAgencyFreight()`(`agency-pricing.ts`)가 할인율을 전체 판매가(`platformSellingTotal`)에 적용하는데, `computeShipperFreight()`(`shipper-pricing.ts`)는 이미 기본운임에만 적용(Issue #457/#491, TASK-B-120에서 Mike가 직접 수정한 이력 있음 — 이번 Task는 그 패턴을 Admin→Agency 계층에도 동일하게 적용하는 작업).

**Jaison이 설계를 확정했으므로 설계 판단 없이 아래 스펙대로 구현**하면 됩니다.

## 조치안 (Jaison 확정 설계 — 그대로 구현)

### 1. `src/types/ups.ts` — `UpsAgencyFreightResult` 타입 수정

현재(209-215행):
```ts
export interface UpsAgencyFreightResult {
  platformSellingTotal: number;
  agencyCostPrice: number;
  agencySellingPrice: number;
  discountRate: number;
  agencyOtherChargesTotal: number;
}
```

아래로 교체 — `UpsShipperFreightResult`와 동일 패턴으로 breakdown 필드 추가:
```ts
export interface UpsAgencyFreightResult {
  baseSellingPrice: number;
  fuelSurchargeSellingAmount: number;
  otherChargesSellingTotal: number;
  surgeFeeSellingAmount: number;
  platformSellingTotal: number;
  agencyCostPrice: number;
  agencySellingPrice: number;
  discountRate: number;
  agencyOtherChargesTotal: number;
}
```

### 2. `src/lib/ups/agency-pricing.ts` — `computeAgencyFreight()` 전면 재작성

현재 파일 전체를 아래로 교체:
```ts
// UPS Agency 단계 요금 계산 — 순수 함수 (DB 호출 없음)
// Issue #310: rate_overrides 폐기, Zone별 할인율 단일 파라미터로 대체
// DEF-B-033: 할인율은 기본운임에만 적용, 부가운임(유류할증+급증수수료+기타)은 정가 그대로
// pass-through — Shipper 단계(shipper-pricing.ts)와 동일 원칙으로 통일(2026-07-29)
//
// agencyCost = baseSellingPrice x (1 - zoneDiscountRate) + fuelSurcharge + otherCharges + surgeFee + agencyOtherChargesCost
// agencySellingPrice = 위와 동일하되 agencyOtherCharges는 selling 기준

import type { UpsAgencyFreightResult } from '@/types/ups';

export interface AgencyOtherChargeAmount {
  sellingPrice: number;
  costPrice: number;
}

export interface AgencyFreightInput {
  baseSellingPrice: number;
  fuelSurchargeSellingAmount: number;
  otherChargesSellingTotal: number;
  surgeFeeSellingAmount: number;
  discountRate: number;
  agencyOtherCharges: AgencyOtherChargeAmount[];
}

export function computeAgencyFreight(input: AgencyFreightInput): UpsAgencyFreightResult {
  const agencyChargesSellingTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.sellingPrice, 0);
  const agencyChargesCostTotal = input.agencyOtherCharges.reduce((sum, c) => sum + c.costPrice, 0);

  const discountedBase = Math.round(input.baseSellingPrice * (1 - input.discountRate) * 100) / 100;
  const passthroughTotal = input.fuelSurchargeSellingAmount + input.otherChargesSellingTotal + input.surgeFeeSellingAmount;
  const platformSellingTotal = input.baseSellingPrice + passthroughTotal;

  return {
    baseSellingPrice: discountedBase,
    fuelSurchargeSellingAmount: input.fuelSurchargeSellingAmount,
    otherChargesSellingTotal: input.otherChargesSellingTotal,
    surgeFeeSellingAmount: input.surgeFeeSellingAmount,
    platformSellingTotal,
    agencyCostPrice: Math.round((discountedBase + passthroughTotal + agencyChargesCostTotal) * 100) / 100,
    agencySellingPrice: Math.round((discountedBase + passthroughTotal + agencyChargesSellingTotal) * 100) / 100,
    discountRate: input.discountRate,
    agencyOtherChargesTotal: agencyChargesSellingTotal,
  };
}
```

### 3. `src/app/actions/ups/freight.ts` — 호출부 수정

현재(약 209행):
```ts
const agency = computeAgencyFreight({
  platformSellingTotal: platform.totalSellingPrice,
  discountRate,
  agencyOtherCharges: (agencyCharges ?? []).map((c) => ({
    sellingPrice: Number(c.selling_price),
    costPrice: Number(c.cost_price),
  })),
});
```

아래로 교체:
```ts
const agency = computeAgencyFreight({
  baseSellingPrice: platform.baseSellingPrice,
  fuelSurchargeSellingAmount: platform.fuelSurchargeSellingAmount,
  otherChargesSellingTotal: platform.otherChargesSellingTotal,
  surgeFeeSellingAmount: platform.surgeFeeSellingAmount,
  discountRate,
  agencyOtherCharges: (agencyCharges ?? []).map((c) => ({
    sellingPrice: Number(c.selling_price),
    costPrice: Number(c.cost_price),
  })),
});
```

### 4. `tests/unit/ups/pricing-engine.test.ts` — TC-UPS-ENGINE-04 재작성

기존(169-188행 부근, 옛 설계 Issue #310 검증용 — 이번 변경으로 반드시 깨짐):
```ts
describe('TC-UPS-ENGINE-04: Agency 단계 계산 (An-14 R3~R5, Issue #310)', () => {
  it('할인율을 platformSellingTotal에 적용해 Agency 가격을 산출한다', () => {
    const result = computeAgencyFreight({
      platformSellingTotal: 100000,
      discountRate: 0.1,
      agencyOtherCharges: [{ sellingPrice: 3000, costPrice: 2000 }],
    });
    expect(result.agencyCostPrice).toBe(92000);
    expect(result.agencySellingPrice).toBe(93000);
  });

  it('할인율 20%, 기타요금 없음', () => {
    const result = computeAgencyFreight({
      platformSellingTotal: 100000,
      discountRate: 0.2,
      agencyOtherCharges: [],
    });
    expect(result.agencyCostPrice).toBe(80000);
  });
});
```

아래로 교체 — 새 원칙(기본운임에만 할인) 검증:
```ts
describe('TC-UPS-ENGINE-04: Agency 단계 계산 (DEF-B-033: 기본운임에만 할인 적용)', () => {
  it('할인율을 기본운임에만 적용, 부가운임은 정가 그대로 합산', () => {
    const result = computeAgencyFreight({
      baseSellingPrice: 80000,
      fuelSurchargeSellingAmount: 15000,
      otherChargesSellingTotal: 5000,
      surgeFeeSellingAmount: 0,
      discountRate: 0.1,
      agencyOtherCharges: [{ sellingPrice: 3000, costPrice: 2000 }],
    });
    // discountedBase = 80000 * 0.9 = 72000, passthrough = 15000+5000+0 = 20000
    expect(result.baseSellingPrice).toBe(72000);
    expect(result.agencyCostPrice).toBe(94000); // 72000+20000+2000
    expect(result.agencySellingPrice).toBe(95000); // 72000+20000+3000
  });

  it('할인율 20%, 기타요금 없음 — 부가운임 전액 정가 pass-through 확인', () => {
    const result = computeAgencyFreight({
      baseSellingPrice: 80000,
      fuelSurchargeSellingAmount: 15000,
      otherChargesSellingTotal: 5000,
      surgeFeeSellingAmount: 0,
      discountRate: 0.2,
      agencyOtherCharges: [],
    });
    // discountedBase = 80000*0.8=64000, cost = 64000+15000+5000 = 84000 (fuel/other 무할인 그대로 포함됨을 확인)
    expect(result.agencyCostPrice).toBe(84000);
  });
});
```

### 건드리지 않는 것 (범위 밖)

- `computeShipperFreight()`(`shipper-pricing.ts`) — 이미 정확함, 변경 없음
- `zen_order_rate_snapshots.metadata.agency` 필드명(`agencyCostPrice`/`agencySellingPrice`/`discountRate`/`agencyOtherChargesTotal`) — 그대로 유지되므로 이 값을 읽기만 하는 `order-revenue-cost.ts`/`ups-daily-close.ts`/`invoice-generator.ts` 등 다운스트림 코드는 **수정 불필요**(계산 함수의 결과값만 정확해지면 자동 전파됨)
- 이미 생성된 오더의 기존 `zen_order_rate_snapshots`/인보이스 데이터 재계산 — 코드 병합 확인 후 Jaison이 직접 처리(운영 데이터 조정)

## 착수 체크리스트

- [ ] `git fetch origin && git checkout TeamB_Dev && git pull origin TeamB_Dev` 후 `feature/teamb-254-...` 브랜치 생성 (`./scripts/next-task-number.sh B` 직접 재확인 — 254 나와야 정상)
- [ ] 위 스펙대로 4개 파일 수정
- [ ] 회귀 테스트: 위 TC-UPS-ENGINE-04 재작성 테스트가 곧 핵심 검증 — 추가로 아래 실측 필요:
  1. `estimateUpsFreight()`(freight.ts) 실제 호출 시 `agency.agencyCostPrice`가 새 공식(기본운임만 할인)으로 정확히 나오는지 실측(원래 코드로 되돌리면 전체금액 할인 값이 나오는 걸 재현 확인)
- [ ] `npm run build` · `npm run test:regression` 직접 실행 후 정확한 결과 기재 — **TC-UPS-ENGINE-04 교체로 인해 이 테스트가 있던 파일의 다른 케이스(TC-UPS-ENGINE-01~03, 05~)에 영향 없는지 확인**
- [ ] **R-10 필수**: 로컬에서 Admin 계정으로 UPS 오더 예상운임 조회 화면 접속 → agency_org_id가 설정된 화주로 견적 조회 시 대리점 원가가 기본운임만 할인된 값으로 표시되는지 스크린샷으로 확인.

## 완료 보고 절차 (R-17 준수)

1. **[코드 커밋]** `[Mike] fix: TASK-B-254 ...` → 2. **원본 배정 파일 그대로 사용**해 `[작업 결과]` 섹션 작성(**커밋 해시 실제 값 기재 — TBD 금지**) + 상태 🔔 → 3. `.agent/ACTIVE_TASK.md` 반영 → 4. `gh issue edit 973 --add-label status:review --remove-label status:open` → 5. `check-R17-DoD` 통과 → 6. 문서 커밋 → 7. PR 생성 (`feature/* → TeamB_Dev`, `Closes #973`)

## 담당자 위반 이력 사전 경고

- Mike: `.agent/VIOLATION_TRACKER.md` 참조 후 착수. 배정 파일을 반드시 그대로 사용할 것 — 새 번호로 재채번하지 말 것. 직전 TASK-B-252(PR#971)에서 핵심 fix(invoice-generator.ts) 부분 테스트가 누락된 이력이 있음 — 이번엔 `computeAgencyFreight()` 자체에 대한 되돌리기 검증을 반드시 실제로 수행할 것. TASK-B-120(Issue #457, 본인이 직접 작업한 Shipper 단계 기본운임-only 할인 수정 이력)과 정확히 동일한 패턴이므로 그 코드를 참고해도 좋음.

## [발견 이슈]

_(담당 Task 범위 밖 이슈. 없으면 "없음" 기재)_

없음
