# DEF-B-031: ADMIN_TO_AGENCY 청구서가 대리점 할인율을 전혀 반영하지 않고, Agency 정산조회 매출/매입 정의가 실제 청구서와 무관하게 계산됨

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 확인 요청("agency 입장에서 매입/매출 정의")에 Jaison이 코드 분석 중 발견, JSJung이 실제 데이터(20%/25% 역마진 시나리오)로 재확인 |
| **긴급도** | High |
| **영향 범위** | `src/lib/finance/settlement/invoice-generator.ts`(ADMIN_TO_AGENCY 인보이스 생성), `src/lib/actions/agency-settlement.ts`(`/agency/settlements` 전체) |

## 현상 1 — ADMIN_TO_AGENCY 청구서가 대리점 할인율 무시하고 항상 100% 청구

`invoice-generator.ts:130-139`:
```ts
const platformTotal = baseFreight + fuelSurcharge + surgeFee + otherCharges;  // UPS 공식 판매가 그대로
...
invoice_tier: 'ADMIN_TO_AGENCY',
total_amount: platformTotal,   // 할인율 조회/적용 코드 없음
```
`zen_agency_pricing_policies`(admin→agency 할인율)를 조회하는 코드가 이 함수 어디에도 없다 — 대리점에게 등록된 할인율(예: 20%)과 무관하게 **항상 UPS 공식 판매가 100%를 그대로 청구**한다.

반면 오더 생성 시점(`orders.ts:71`, `estimateUpsFreight()`)에는 이미 할인 적용된 정확한 원가가 `zen_order_rate_snapshots.metadata.agency.agencyCostPrice`에 계산·저장되어 있다 — 인보이스 생성 로직이 이 값을 쓰지 않고 `metadata.platform` breakdown을 무할인으로 다시 합산하는 게 원인.

**결과**: 대리점 할인율 정책(`zen_agency_pricing_policies.discount_rate`)을 몇 %로 바꾸든 실제 청구서 금액에는 전혀 반영되지 않는다 — 정책 테이블이 사실상 청구에 아무 영향을 주지 못하는 죽은 설정.

## 현상 2 — Agency 정산조회(`/agency/settlements`) 매출/매입이 실제 청구서와 무관하게 별도 계산됨

`agency-settlement.ts:45-78`(`_calculateOrderSettle()`), 이를 사용하는 `getAgencySettlementSummary`/`getAgencyShipperSettlements`/`getAgencyOrderSettlements`/`exportAgencySettlementExcel` 전부 동일 문제:

| 항목 | 올바른 정의(JSJung 확인) | 현재 코드 |
|:-----|:-----|:-----|
| 매출 | 화주 오더의 확정 운임(AGENCY_TO_SHIPPER 인보이스 금액) | `zen_order_rate_snapshots.applied_unit_price` = UPS 공식 판매가(`platform.totalSellingPrice`) — 화주 청구액이 아님 |
| 매입 | agency 원가(ADMIN_TO_AGENCY 인보이스 금액) | 저장된 인보이스를 조회하지 않고 화면에서 매번 재계산: `platform 판매가 합계 × (1 − 현재 등록된 zone 할인율)` |

두 필드 모두 `zen_invoices`를 전혀 참조하지 않는다 — 매출은 UPS 정가, 매입은 "현재 정책으로 재계산한 가상의 원가"를 보여줄 뿐, 실제 청구서 금액과 별개다. 현상 1과 겹쳐서 실제 청구서(무할인 100%)와 이 화면의 매입(정책 할인율 적용값)이 애초에 서로 다른 두 숫자를 보여주고 있었음.

## 근본 원인

두 현상 모두 "인보이스 생성/조회 로직이 실제 저장된 인보이스 금액이 아니라 rate_snapshot 메타데이터를 각자 다른 방식으로 재해석"하는 동일 패턴에서 비롯됨 — 이번 세션에 여러 차례 반복된 "invoice-tier 혼동" 계열(DEF-B-026~030)과 근본 원인이 유사하나, 이번 건은 금액 계산 자체가 틀렸다는 점에서 더 심각.

## 권장 조치

1. `invoice-generator.ts`의 ADMIN_TO_AGENCY 인보이스 생성 시 `meta.agency?.agencyCostPrice`(이미 계산되어 있는 할인 적용 원가)를 `total_amount`로 사용 — 없으면 기존 `platformTotal` 폴백 유지
2. `agency-settlement.ts`의 매출/매입 계산을 `zen_order_rate_snapshots` 재해석 대신 **해당 오더의 실제 `zen_invoices`**(AGENCY_TO_SHIPPER=매출, ADMIN_TO_AGENCY=매입)에서 직접 조회하도록 재설계
3. 위 두 수정이 반영된 후에만 할인율 정책 데이터(20%→40% 등) 변경이 청구서·정산화면 양쪽에 일관되게 반영됨 — 코드 수정이 선행되어야 데이터 조정이 의미가 있음
