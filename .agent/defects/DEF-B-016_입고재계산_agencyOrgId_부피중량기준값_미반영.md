# DEF-B-016: 입고 측정값 변경 재계산 시 `agencyOrgId` 미전달 — 대행사별 부피중량 기준값(divisor) 무시됨

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-07-27 |
| **보고자** | jungjs (Jaison) — Issue #881 코멘트로 예상운임 산정 규칙 명시 후 코드 대조 중 발견 |
| **긴급도** | Medium |
| **우선순위** | P2 |
| **관련 Issue** | [#881](https://github.com/EdwardKwon89/ZENITH.KR.LMS/issues/881) (코멘트로 산정 규칙 명시됨) |
| **관련 선행 작업** | TASK-B-218(PR#875) — `applyPackageMeasurements()` 최초 구현 |

## jungjs 확정 산정 규칙 (Issue #881 코멘트 원문 요약)

- **등록 시점**: 오더 등록 화면에서 예상운임 최초 산정
- **갱신 시점**: 입고 등 화면에서 중량/부피중량 정보가 변경되면 재산정
- **산정 방식**:
  1. 운임 적용 중량 = max(부피중량, 실중량). 부피중량 = 부피 / **부피중량 기준값**
  2. 운임 적용 중량 + zone 기준으로 판매가 조회 → **배정받은 zone별 할인율** 적용해 최종 판매가 산출
  3. 수신처 국가 기준 급증 긴급 수수료 적용
  4. (최종 판매가 + 급증긴급수수료) × 유류할증율 = 유류할증료
  5. 예상운임 = 최종 판매가 + 급증긴급수수료 + 유류할증료

`src/lib/ups/pricing-engine.ts`(Team A 소유, `computeUpsFreight`/`applySurgeFee`)의 실제 계산식을 대조 검증한 결과 위 5단계 공식과 **정확히 일치**함(대수적으로 `(baseSellingPrice+surgeBase)×(1+fuelRate)+otherCharges` 로 확인) — Team A 엔진 자체는 문제 없음.

## 현상 / 원인 (Team B 소유 파일 내 결함)

`src/app/actions/operations/orders.ts`의 `applyPackageMeasurements()`(입고 측정값 변경 시 재계산 담당, TASK-B-218에서 신규 작성)가 `estimateUpsFreightFn()` 호출 시 **`agencyOrgId`를 전달하지 않음**:

```ts
const newEstimate = await estimateUpsFreightFn({
  productId: product.id,
  destCountryCode,
  actualWeightKg: totalWeight,
  dimL: packages[0]?.length,
  dimW: packages[0]?.width,
  dimH: packages[0]?.height,
  incoterms: orderMeta.incoterms,
  shipperOrgId: orderMeta.shipper_id,
  // agencyOrgId 누락
});
```

`estimateUpsFreight()`(`src/app/actions/ups/freight.ts`) 내부에서 `agencyOrgId`가 없으면:
```ts
let effectiveDivisor = input.volumetricDivisor;
if (input.agencyOrgId && !input.volumetricDivisor) {
  // zen_organizations.volumetric_divisor 조회 — agencyOrgId 없으면 이 블록 자체가 스킵됨
}
```
→ `effectiveDivisor`가 `undefined`로 남고, `calcChargeableWeight()`의 기본값(`5000`)이 그대로 사용됨. 즉 **대행사가 5500 또는 6000으로 설정돼 있어도 입고 재계산에서는 항상 5000으로 계산**되어 위 산정 규칙 1번("부피중량 기준값")이 어긋남.

반면 오더 **등록 시점**(`saveOrderRateSnapshot()`, 동일 파일 28행)은 `agencyOrgId: agencyOrgId ?? undefined`를 정확히 전달하고 있어 등록 시점과 재계산 시점 사이에 **불일치(비대칭)**가 존재함. `orderMeta` select에도 `agency_org_id` 컬럼 자체가 빠져있어(약 733행 select 목록) 값을 가져올 수조차 없는 상태.

## 조치안 (Jaison 확정 설계)

`applyPackageMeasurements()` 수정 2곳:

1. `orderMeta` select에 `agency_org_id` 추가:
```ts
const { data: orderMeta } = await supabase
  .from('zen_orders')
  .select('status, transport_mode, ups_product_code, dest_port_id, recipient_country_code, incoterms, shipper_id, order_no, agency_org_id')
  .eq('id', orderId)
  .maybeSingle();
```

2. `estimateUpsFreightFn` 호출에 `agencyOrgId` 추가:
```ts
const newEstimate = await estimateUpsFreightFn({
  productId: product.id,
  destCountryCode,
  actualWeightKg: totalWeight,
  dimL: packages[0]?.length,
  dimW: packages[0]?.width,
  dimH: packages[0]?.height,
  incoterms: orderMeta.incoterms,
  agencyOrgId: orderMeta.agency_org_id ?? undefined,
  shipperOrgId: orderMeta.shipper_id,
});
```

(등록 시점처럼 `zen_agency_shippers`를 다시 조회할 필요 없음 — `zen_orders.agency_org_id`에 이미 값이 저장되어 있으므로 그대로 재사용.)

## 관련 Task
- `TASK-B-222`에 통합 배정(DEF-B-015 RLS 수정과 같은 함수·같은 PR로 처리)

## 관련 파일
- `src/app/actions/operations/orders.ts` — `applyPackageMeasurements()` (약 725~815행)
