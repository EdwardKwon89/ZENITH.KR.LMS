# DEF-B-033: Admin→Agency 할인율이 전체 판매가에 적용됨 — "할인은 기본운임에만 적용" 원칙 위반

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 확인 지시("할인은 기본운임에만 적용")로 Jaison이 재분석하던 중 발견 |
| **긴급도** | High |
| **영향 범위** | `src/lib/ups/agency-pricing.ts`(`computeAgencyFreight()`), `src/app/actions/ups/freight.ts`(호출부), `src/types/ups.ts`(`UpsAgencyFreightResult`), `tests/unit/ups/pricing-engine.test.ts`(TC-UPS-ENGINE-04) |

## 현상

Admin→Agency 원가 계산(`computeAgencyFreight()`, `agency-pricing.ts:24`)이 할인율을 **전체 판매가(`platformSellingTotal` = 기본운임+유류할증+급증수수료+기타부과금 합계)**에 적용한다:
```ts
const baseCost = input.platformSellingTotal * (1 - input.discountRate);
```

반면 Agency→Shipper 계산(`computeShipperFreight()`, `shipper-pricing.ts:17`)은 이미 **기본운임에만** 할인을 적용하고 유류할증/기타부과금/급증수수료는 정가 그대로 pass-through한다(Issue #457/#491). "할인은 기본운임에만 적용한다"는 JSJung 확인 지시에 따르면 Admin→Agency 계층도 동일 원칙을 따라야 하는데 현재는 다르다.

## 근본 원인 (설계 이력)

이 차이는 버그가 아니라 **의도적으로 서로 다르게 설계된 이력**이 있음 — `tests/unit/ups/pricing-engine.test.ts`의 테스트 제목이 이를 명시적으로 보여줌:
- TC-UPS-ENGINE-04("할인율을 **platformSellingTotal에 적용**해 Agency 가격을 산출한다") — Issue #310(An-14 R3~R5) 근거
- TC-UPS-ENGINE-05("화주 할인율을 **기본운임에만** 적용해 최종 운송비를 산출한다") — Issue #457/#491(An-14 R6) 근거

즉 두 계층이 각기 다른 Issue에서 별도로 설계되며 일관성이 어긋난 상태로 유지되어 왔음. JSJung이 "기본운임에만 적용"을 전체 원칙으로 재확인 지시함에 따라 Admin→Agency 계층도 이에 맞춰 변경.

## 권장 조치

`computeAgencyFreight()`를 `computeShipperFreight()`와 동일한 패턴으로 재설계 — 입력을 `platformSellingTotal`(집계값) 대신 `baseSellingPrice`/`fuelSurchargeSellingAmount`/`otherChargesSellingTotal`/`surgeFeeSellingAmount`로 분리해서 받고, 할인은 `baseSellingPrice`에만 적용:
```ts
agencyCostPrice = baseSellingPrice × (1 - discountRate) + fuelSurcharge + otherCharges + surgeFee + agencyOtherChargesCost
```

**영향 범위 확인 완료**: `zen_order_rate_snapshots.metadata.agency.{agencyCostPrice, agencySellingPrice, discountRate, agencyOtherChargesTotal}` 필드명은 그대로 유지되므로, 이 값을 읽기만 하는 다운스트림 소비처(`order-revenue-cost.ts`, `ups-daily-close.ts`, `invoice-generator.ts`)는 코드 변경 불필요 — `computeAgencyFreight()`가 계산하는 **값 자체**만 정확해지면 자동으로 올바르게 전파됨.

**기존 테스트(TC-UPS-ENGINE-04)는 옛 설계(Issue #310)를 검증하던 것이라 이번 변경으로 반드시 깨짐** — 새 원칙에 맞게 재작성 필요.

**데이터 후속 조치(Jaison이 직접 처리)**: 코드 수정 완료 후, 어제(DEF-B-031) 전체금액×0.6 기준으로 갱신해둔 7건 오더의 `zen_order_rate_snapshots`/ADMIN_TO_AGENCY 인보이스 금액을 기본운임만 40% 할인하는 새 공식으로 재계산 — 코드 병합 후 Jaison이 직접 수행.
