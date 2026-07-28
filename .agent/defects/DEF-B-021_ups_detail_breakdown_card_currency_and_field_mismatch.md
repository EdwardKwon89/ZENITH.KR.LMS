# DEF-B-021: UPS 오더 상세 "운임 세부 내역" 카드 — 통화 오표기 + 필드명 불일치로 항상 $0.00/과다표시

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `orders/[orderId]/ups-detail` 페이지 실측 점검 중 Jaison이 직접 재현·근본원인 확인 |
| **긴급도** | High |
| **영향 범위** | `src/components/ups/UpsOrderBreakdownCard.tsx` — UPS 오더 상세 화면의 "운임 세부 내역(Freight Breakdown)" 카드 표시만 해당. 실제 정산/인보이스 발행 로직(`invoice-generator.ts`)은 영향 없음(별도 확인 완료 — 정상). |
| **관련 파일** | `src/components/ups/UpsOrderBreakdownCard.tsx` (lines 40-44, 125) |

## 현상

주문 `ZEN-2026-000001`(order_id `c00ec504-7b84-4977-99d8-78982f54484b`)의 `ups-detail` 페이지에서 "운임 세부 내역" 카드가:
- 기본 운임(Base Freight): **$0.00** (실제 값 306,200원 존재함에도)
- 유류 할증료(Fuel Surcharge): **$0.00** (실제 값 56,647원 존재함에도)
- 추정 총 청구액(Total Estimate): **$393000.40 USD** (실제로는 393,000.4**원**, 약 $291 상당)

## 근본 원인 (직접 재현 확인)

`zen_order_rate_snapshots.metadata`를 직접 조회한 결과:
```json
{"platform": {"currency": "KRW", "totalSellingPrice": 393000.39825,
  "breakdown": {"baseSellingPrice": 306200, "fuelSurchargeSellingAmount": 56647,
                "surgeFeeSellingAmount": 153.4, "otherChargesSellingTotal": 30000, ...}}}
```

**버그 1 — 필드명 불일치** (`UpsOrderBreakdownCard.tsx:40-43`):
```ts
const baseFreight = Number(breakdown.baseFreight || breakdown.freight || platformMeta?.freightCostPrice || 0);
const fuelSurcharge = Number(breakdown.fuelSurcharge || 0);
const surgeFee = Number(breakdown.surgeFee || breakdown.surgeEmergencyFee || 0);
const extraCharges = Number(breakdown.extraCharges || breakdown.additionalCharges || 0);
```
실제 스냅샷의 필드명은 `baseSellingPrice`/`fuelSurchargeSellingAmount`/`surgeFeeSellingAmount`/`otherChargesSellingTotal`이며 위 코드가 찾는 이름(`baseFreight`/`fuelSurcharge`/`surgeFee`/`extraCharges`)과 전혀 일치하지 않아 항상 0으로 폴백됨.

**버그 2 — 통화 미확인/하드코딩** (`UpsOrderBreakdownCard.tsx:44,125`):
```ts
const totalFreight = Number(platformMeta?.totalSellingPrice || (baseFreight + fuelSurcharge + surgeFee + extraCharges));
...
<span className="font-mono text-amber-400 text-base font-black">${totalFreight.toFixed(2)} USD</span>
```
`platformMeta.currency`(이 케이스는 `"KRW"`)를 전혀 확인하지 않고 `$`/`USD`를 하드코딩 — KRW 금액을 그대로 USD로 오표기.

**참고(안심 포인트)**: `src/lib/finance/settlement/invoice-generator.ts:125`는 동일한 `platform.*` 데이터를 사용하면서 `const agencyCurrency = platform.currency || 'USD';`로 정확히 통화를 확인·태그하고 있어, 실제 발행되는 인보이스 금액/통화는 이 버그의 영향을 받지 않음 — 순수 이 카드 컴포넌트의 표시 버그.

## 권장 조치

1. `baseFreight`/`fuelSurcharge`/`surgeFee`/`extraCharges` 추출 시 실제 스냅샷 필드명(`baseSellingPrice`/`fuelSurchargeSellingAmount`/`surgeFeeSellingAmount`/`otherChargesSellingTotal`)을 우선 사용하도록 수정
2. `platformMeta?.currency`를 읽어 통화 기호/라벨을 동적으로 표시(KRW면 "₩"/"KRW", USD면 "$"/"USD") — 하드코딩 제거
3. 회귀 테스트: 실제 컴포넌트를 이 오더와 동일한 shape(KRW, 필드명 일치)의 `snapshotMeta`로 렌더링해 화면에 정확한 금액·통화가 나타나는지 검증(behavioral, 값 변경 시 반드시 FAIL하는 assertion)
