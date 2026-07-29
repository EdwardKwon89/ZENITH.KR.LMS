# DEF-B-032: daily-billing 요약/상세 화면의 "합계"가 실제 인보이스 금액이 아닌 무할인 원가 합계를 보여줌

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/finance/daily-billing` 화주별 일별 청구 집계 정상 조회 여부를 Jaison이 직접 확인하던 중 발견 |
| **긴급도** | Medium |
| **영향 범위** | `src/app/actions/finance/daily-billing.ts`(`getShipperDailyOrdersDetails()`), `zen_order_costs` vs `zen_invoices` 정합성 |

## 현상 (실측 확인)

ADMIN 계정으로 `/finance/daily-billing` 조회 시(DEF-B-031 40% 할인율 수정 이후):

- **요약 표의 "총액"**(그룹 합계, `getShipperDailyBillingSummary()`): 인보이스 `total_amount` 기준 → ₩1,322,447.85 (40% 할인 정확히 반영)
- **같은 그룹의 기본운임+유류할증+급증수수료+기타부과금 합계**(`zen_order_costs` 기준): ₩2,042,409.76 (무할인 원가)
- **"상세" 펼침의 개별 오더 "합계(KRW)"**(`getShipperDailyOrdersDetails()`): 역시 `zen_order_costs` 합계로 계산 — 실제 청구된 인보이스 금액(`matchingInv.total_amount`)과 무관

같은 화면 안에서 "총액"과 "세부 항목 합계"가 서로 다른 기준(할인 후 vs 할인 전)을 쓰고 있어 정합성이 깨져 보임.

## 근본 원인

`getShipperDailyOrdersDetails()`(`daily-billing.ts:355-370` 부근)가 개별 오더의 `totalAmountKrw`를 **`zen_order_costs` 항목별 합산으로 재계산**한다:
```ts
totalAmountKrw: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
```
같은 함수 안에서 이미 `matchingInv`(해당 오더의 인보이스)를 조회해두고도 `matchingInv.total_amount`를 전혀 쓰지 않는다 — DEF-B-029 수정 당시 세운 설계 원칙("총액은 인보이스 확정 금액, breakdown은 원가 참고용")이 요약 표에는 적용됐지만 **상세 펼침의 "합계(KRW)" 컬럼에는 애초에 적용되지 않았음**.

DEF-B-031(admin→agency 할인율 반영) 수정 전에는 ADMIN_TO_AGENCY 인보이스도 무할인이라 두 숫자가 거의 같아 문제가 드러나지 않았으나, 할인율이 실제로 반영되면서(20%→40%) 괴리가 커져 눈에 띄게 됨.

## 권장 조치

`getShipperDailyOrdersDetails()`의 `matchingInv` select에 `total_amount, currency` 추가, `totalAmountKrw`를 `zen_order_costs` 합산 대신 **`matchingInv.total_amount`를 KRW 환산한 값**으로 교체. 기본운임/유류할증/급증수수료/기타부과금 개별 항목은 기존 관례대로 원가 참고용(무할인)으로 유지 — "합계"만 실제 청구 금액 기준으로 신뢰할 수 있게 만드는 것이 목표.
