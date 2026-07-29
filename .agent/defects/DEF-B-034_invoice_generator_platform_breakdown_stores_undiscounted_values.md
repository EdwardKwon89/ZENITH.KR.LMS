# DEF-B-034: ADMIN_TO_AGENCY 인보이스의 `metadata.platform_breakdown`이 할인 미반영 상태로 저장됨

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung 요청으로 `/finance/daily-billing` 요약/상세 breakdown 정합성을 Jaison이 재확인하던 중 발견 |
| **긴급도** | Medium |
| **영향 범위** | `src/lib/finance/settlement/invoice-generator.ts`(ADMIN_TO_AGENCY 인보이스 생성), `src/app/actions/finance/daily-billing.ts`(`getShipperDailyBillingSummary()`) |

## 현상 (실측 확인)

DEF-B-032(PR#976)로 상세 펼침의 breakdown party는 정확해졌으나(admin↔agency 값으로 교체), **개별 항목 자체는 여전히 무할인 UPS 정가**라 "합계(실제 청구액, 기본운임만 40% 할인 반영)"와 세부 항목 합계가 일치하지 않는다:

```
ZEN-2026-000005: 기본운임 ₩80,300 + 유류할증 ₩14,855.5 + 급증 ₩0.081 + 기타 ₩0 = ₩95,155.58(무할인)
합계(KRW): ₩63,035.58(실제 청구액, 기본운임만 40% 할인)
```

요약 표(`getShipperDailyBillingSummary()`)도 여전히 `zen_order_costs`(화주 청구 전용 원장) 기반이라 같은 문제가 있음 — DEF-B-032가 상세만 고쳤고 요약은 손대지 않았음.

**중요(JSJung 지시)**: 화면 표시값을 "합계 − 부가운임"으로 역산해서 맞추는 방식은 금지 — **저장 시점의 로직 자체를 고쳐서, 화면은 저장된 값을 그대로 읽기만 하면 되도록** 해야 함.

## 근본 원인

`invoice-generator.ts`가 ADMIN_TO_AGENCY 인보이스 생성 시 `metadata.platform_breakdown`을 저장하는 코드:
```ts
const baseFreight = Number(platform.baseSellingPrice) || 0;        // meta.platform(무할인)에서 조회
const fuelSurcharge = Number(platform.fuelSurchargeSellingAmount) || 0;
const surgeFee = Number(platform.surgeFeeSellingAmount) || 0;
const otherCharges = Number(platform.otherChargesSellingTotal) || 0;
...
metadata: { ..., platform_breakdown: { baseFreight, fuelSurcharge, surgeFee, otherCharges } }
```
어제 DEF-B-031에서 `total_amount`(합계)만 `meta.agency.agencyCostPrice`(할인 반영)로 고쳤지, **`platform_breakdown`(항목별 저장값)은 여전히 `meta.platform`(무할인)을 참조**하도록 방치됨.

DEF-B-033(PR#974) 수정 이후 `computeAgencyFreight()`는 이미 할인 반영된 breakdown을 전부 계산해서 반환한다 — 반환 객체에 `baseSellingPrice`(할인된 기본운임)·`fuelSurchargeSellingAmount`/`otherChargesSellingTotal`/`surgeFeeSellingAmount`(pass-through, 무할인과 동일값)가 이미 존재하며, 이 값이 `zen_order_rate_snapshots.metadata.agency`에 저장됨(오더 생성 시점). `invoice-generator.ts`가 이 필드를 안 쓰고 `meta.platform`을 계속 참조하는 게 원인.

## 권장 조치

1. `invoice-generator.ts`: `platform_breakdown` 저장 시 `meta.platform.*` 대신 **`meta.agency.*`**(이미 할인 반영됨)를 사용하도록 교체. 구버전 rate_snapshot(DEF-B-033 이전 생성, `agency.baseSellingPrice` 필드 없음)에 대한 폴백 필요.
2. `getShipperDailyBillingSummary()`: DEF-B-032(PR#976)가 상세(`getShipperDailyOrdersDetails()`)에 적용한 것과 동일한 패턴(ADMIN_TO_AGENCY 티어는 `zen_order_costs` 대신 `metadata.platform_breakdown` 사용)을 요약 함수에도 적용.

위 두 가지를 코드로 고치면, `platform_breakdown` 자체가 할인 반영된 정확한 값으로 저장되므로 화면(요약·상세 양쪽)은 그 값을 그대로 읽기만 해도 "세부 항목 합계 = 합계" 자동으로 일치함 — 화면단 역산 로직 불필요.

## 데이터 후속 조치 (Jaison이 직접 처리)

코드 병합 확인 후, 기존 7건 오더(ZEN-2026-000001~007)의:
- `zen_order_rate_snapshots.metadata.agency`에 `baseSellingPrice`/`fuelSurchargeSellingAmount`/`otherChargesSellingTotal`/`surgeFeeSellingAmount` 필드 추가(현재 없음 — DEF-B-033 이전 방식으로 백필했었음)
- 각 ADMIN_TO_AGENCY 인보이스의 `metadata.platform_breakdown`을 할인 반영된 값으로 재계산·갱신
- `scripts/seed-local.ts`도 동일하게 동기화
