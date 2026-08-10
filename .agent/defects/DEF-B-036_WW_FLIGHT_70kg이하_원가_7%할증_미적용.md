# DEF-B-036: WW_FLIGHT(Freight) 70kg 이하 구간 원가에 UPS_COST_SURCHARGE_RATE(+7%)가 적용되지 않음

| 항목 | 내용 |
|:-----|:------|
| **발견일** | 2026-08-09 |
| **발견자** | JSJung 지적("오늘 UPS 원가정보 수정 시 로직을 빼먹은 것 같다") → Jaison 코드 확인 |
| **긴급도** | High |
| **관련 파일** | `src/lib/ups/pricing-engine.ts:269-292` (`computeUpsFreight`, FREIGHT 분기) |
| **관련 마이그레이션** | `supabase/migrations/20260809000000_ups_z1_tier_freight_min_gap_fix.sql` 등 오늘 세션에서 `zen_ups_freight_minimums`/`zen_ups_weight_tier_rates`(WW_FLIGHT) 원가 실측치를 처음 채워 넣은 작업 |

## 배경 — 원가 +7% 규칙

`pricing-engine.ts` 상단 주석(An-14 §0-1 A1, §3-6, SNTL 원자료 근거): "원가표 대입 후 +7%가 실질 납부운임". 즉 `ups_원가_260609.pdf`(및 `UPS_원가표.pdf`) 등 원본 원가 자료의 값은 DB에 **원본 그대로(raw)** 저장하고, 실제 계산 시점에 `UPS_COST_SURCHARGE_RATE = 0.07`을 곱해야 SNTL이 UPS에 실제로 납부하는 원가가 나온다. 이 규칙은 과거 이중 적용 버그가 있었다가 "DB는 raw, 계산 시 1회만 곱한다"로 정리된 바 있음.

## 현상

`computeUpsFreight()`의 `baseCostPrice` 산정 4개 분기 중 **3개는 정확히 `× (1 + UPS_COST_SURCHARGE_RATE)`를 적용하지만, WW_FLIGHT(Freight) 상품군의 70kg 이하(freight_minimum 직접 사용) 분기만 누락**되어 있다.

```ts
// pricing-engine.ts:269-292
if (productFamily === 'FREIGHT') {
  if (actualWeight <= 70.0) {
    baseSellingPrice = Number(data.freightMinimum.min_charge_selling);
    baseCostPrice = Number(data.freightMinimum.min_charge_cost);   // ← 7% 미적용
    baseRateId = data.freightMinimum.id;
  } else {
    ...
    baseCostPrice = (minCost + (actualWeight - 70) * Number(tier.price_per_kg_cost))
      * (1 + UPS_COST_SURCHARGE_RATE);                              // ← 70kg 초과는 정상 적용
  }
} else {
  // Express/Saver/Expedited ≤20kg
  baseCostPrice = Number(data.baseRate.cost_price) * (1 + UPS_COST_SURCHARGE_RATE);   // 정상
  // >20kg
  baseCostPrice = (baseCost + (actualWeight - 20) * Number(tier.price_per_kg_cost))
    * (1 + UPS_COST_SURCHARGE_RATE);                                // 정상
}
```

## 영향

WW_FLIGHT(Express Freight) 상품으로 청구중량 70kg 이하 오더의 **원가가 실제 UPS 납부 원가보다 정확히 7% 낮게 계산·기록**된다. 판매가는 정상이므로 마진이 실제보다 7%만큼 과대 표시된다.

현재 DB(`zen_ups_freight_minimums`, 오늘 세션에서 전 Zone 실측치로 신규 등록)의 `min_charge_cost` 예시:

| Zone | min_charge_cost(DB, raw) | 현재 계산상 원가(버그) | 실제 적용돼야 할 원가(×1.07) | 차이 |
|:----:|--:|--:|--:|--:|
| Z1 | 220,449.00 | 220,449.00 | 235,880.43 | -15,431.43 |
| Z8 | 921,675.85 | 921,675.85 | 986,193.16 | -64,517.31 |

## 재현

`computeUpsFreight()`에 WW_FLIGHT 상품·60kg 입력(≤70kg) → `breakdown.baseCostPrice`가 `freightMinimum.min_charge_cost`와 정확히 동일(승수 미적용)함을 직접 호출로 확인 가능. 70kg 초과 입력 시에는 `× 1.07` 적용된 값이 나와 대조된다.

## 권장 조치

`pricing-engine.ts:276`을 다음과 같이 수정:
```ts
baseCostPrice = Number(data.freightMinimum.min_charge_cost) * (1 + UPS_COST_SURCHARGE_RATE);
```

## 참고

TASK-B-259로 배정. 상세 지시사항은 해당 task file 참조.
