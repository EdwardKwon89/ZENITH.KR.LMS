# DEF-B-032: daily-billing 상세 화면이 ADMIN_TO_AGENCY 그룹에서도 화주 청구(AGENCY_TO_SHIPPER) 쪽 금액을 보여줌

> **[2026-07-29 재분석 — 최초 진단보다 심각함]** 최초 발견 시 "합계(총계)만 실제 인보이스와 다르다"고 진단했으나, JSJung 재확인 결과 **기본운임/유류할증/급증수수료/기타부과금 개별 항목 자체도 admin↔agency 관계가 아니라 화주↔대리점(AGENCY_TO_SHIPPER) 관계의 금액**임이 확인됨. 아래 "현상"·"근본 원인"·"권장 조치" 전부 이 재분석 내용으로 갱신함.

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/finance/daily-billing` 화주별 일별 청구 집계 정상 조회 여부를 Jaison이 직접 확인하던 중 발견 |
| **긴급도** | Medium |
| **영향 범위** | `src/app/actions/finance/daily-billing.ts`(`getShipperDailyOrdersDetails()`), `zen_order_costs` vs `zen_invoices` 정합성 |

## 현상 (실측 확인)

ADMIN 계정으로 `/finance/daily-billing`에서 **ADMIN_TO_AGENCY(Zenith Agency Partners) 그룹**의 "상세" 펼침 조회 시(DEF-B-031/033 반영 이후), ZEN-2026-000004(admin→agency 원가 실제 청구액 ₩174,270.47) 기준 비교:

| 항목 | 화면 표시값(`zen_order_costs`) | 실제 admin→agency 금액 |
|:-----|:-----|:-----|
| 기본운임 | ₩166,500 | ₩133,200(=222,000×60%, DEF-B-033 기본운임-only 40% 할인) |
| 유류할증 | ₩41,070 | ₩41,070(부가운임은 할인 없이 동일 — 우연히 일치) |
| **합계** | ₩207,570.47(=AGENCY_TO_SHIPPER 인보이스 금액과 정확히 일치) | ₩174,270.47(=실제 ADMIN_TO_AGENCY 인보이스 금액) |

166,500은 UPS 정가 222,000에 **화주 할인율 25%**(222,000×0.75)를 적용한 값 — **admin↔agency 관계가 아니라 화주↔대리점(AGENCY_TO_SHIPPER) 관계의 금액**이 그대로 표시되고 있음. "합계"뿐 아니라 기본운임/유류할증/급증수수료/기타부과금 **개별 항목 자체도 다른 당사자의 숫자**임.

## 근본 원인

`getShipperDailyOrdersDetails()`(`daily-billing.ts`)가 그룹의 인보이스 티어(ADMIN_TO_AGENCY/AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER)와 무관하게 **항상 `zen_order_costs` 하나만** 조회해서 기본운임/유류할증/급증수수료/기타부과금 및 "합계(KRW)"를 계산한다:
```ts
totalAmountKrw: baseFreight + fuelSurcharge + surgeFee + otherCharge + actualAdj,
```
`zen_order_costs`는 애초에 **화주 확정 청구(AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 인보이스 생성용) 전용 원장**이라:
- **AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 그룹에서 볼 때**: 문제 없음 — 그 인보이스를 만든 바로 그 데이터라 합계·항목별 breakdown 전부 정확
- **ADMIN_TO_AGENCY 그룹에서 볼 때**: `zen_order_costs`가 이 관계와 무관한 다른 당사자 데이터라 전부 틀림

다행히 ADMIN_TO_AGENCY 인보이스 생성 시(`invoice-generator.ts`) `metadata.platform_breakdown`에 **UPS 정가 기준 breakdown**(기본운임/유류할증/급증수수료/기타부과금)이 이미 저장되어 있음(실측: `INV-SEED-000001-AD2A`의 metadata에 `{baseFreight: 337600, fuelSurcharge: 62456, surgeFee: 191.97, otherCharges: 30000}` 존재) — `getShipperDailyOrdersDetails()`가 이미 조회해둔 `matchingInv`에 이 필드가 있는데도 안 쓰고 있었을 뿐.

## 권장 조치

`getShipperDailyOrdersDetails()`의 `matchingInv` select에 `total_amount, currency, invoice_tier` 추가, 인보이스 티어 기준으로 분기:

| | AGENCY_TO_SHIPPER/ADMIN_TO_SHIPPER 그룹 | ADMIN_TO_AGENCY 그룹 |
|:-----|:-----|:-----|
| 기본운임/유류할증/급증수수료/기타부과금 | `zen_order_costs`(기존 방식 유지 — 이미 정확) | `matchingInv.metadata.platform_breakdown`으로 교체 |
| 합계(KRW) | `zen_order_costs` 합계(기존 방식 유지) | `matchingInv.total_amount` 기준 |

`platform_breakdown`은 UPS 정가(무할인) 기준 참고값이라는 점은 유지 — DEF-B-033 할인이 기본운임에만 적용되는 만큼 항목별 정확한 할인후 값을 보여주려면 추가 계산이 필요하나, 이번 범위는 "무할인이라도 최소한 올바른 당사자(admin↔agency)의 숫자"로 바로잡는 것까지로 한정.
