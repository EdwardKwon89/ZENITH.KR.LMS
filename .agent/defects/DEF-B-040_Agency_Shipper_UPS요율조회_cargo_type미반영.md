# DEF-B-040 — Agency/Shipper UPS 요율조회 화면이 cargo_type(DOC/NON_DOC) 축을 무시하고 잘못된 할인율을 원가에 적용

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | JSJung이 "master air"(role 정정 후) 계정으로 `/agency/ups-rates` 화면을 확인하던 중, 등록한 할인율(DOC 55%/NON_DOC 75%)이 "대리점 원가" 표시에 이상하게 적용되는 것을 발견 |
| **긴급도** | High — 대리점/화주가 실제로 보는 원가 표시가 부정확(재무 데이터 정확성 문제, 다만 실 요금 계산 엔진(`freight.ts`)에는 영향 없음 — DEF-B-038 수정으로 이미 정확) |
| **현재 상태** | 미수정 |

## 근본 원인 — Issue #1018(cargo_type 축 도입) 당시 이 화면들이 함께 갱신되지 않음

`zen_agency_pricing_policies`/`zen_agency_shipper_zone_discounts`는 Issue #1018로 Zone당 최대 3개 행(ALL/DOC/NON_DOC)을 가질 수 있게 됐으나, 아래 화면들은 여전히 **Zone 하나당 할인율 1개**라고 가정하고 있어 여러 cargo_type 행이 있으면 마지막에 로드된 값이 나머지를 조용히 덮어씀.

### 1. `src/app/[locale]/(dashboard)/agency/ups-rates/agency-ups-rates-client.tsx`
```ts
interface PricingPolicy { id: string; agency_org_id: string; zone_id: string; discount_rate: number; is_active: boolean; } // cargo_type 없음

const policyByZone = Object.fromEntries(
  pricingPolicies.map(p => [p.zone_id, Number(p.discount_rate)])  // zone_id만 key → cargo_type별 여러 행이 있으면 마지막 값만 남음
);
const calcAgencyCost = (sellingPrice: number, zoneId: string): number => { ... } // cargoType 파라미터 자체가 없음
```
`WeightTierRateTable`/`FreightMinimumTable`의 "대리점 원가" 컬럼, `UpsBaseRateMatrix`(`priceMode="agency"`)의 괄호 안 원가 표시 전부 이 버그의 영향을 받음.

### 2. `src/components/ups/UpsBaseRateMatrix.tsx`
```ts
const getDiscountRate = (zoneId: string): number => {
  return discountRateMap[zoneId] ?? 0;  // 동일하게 zone_id만 사용, product(cargo_type) 무관
};
```
Express DOC 행과 Express NON_DOC 행이 같은 Zone 컬럼에 있으면 **둘 다 같은(잘못된) 할인율**로 원가가 계산됨.

### 3. `src/app/[locale]/(dashboard)/shipper/ups-rates/page.tsx` + `shipper-ups-rates-client.tsx`
```ts
// page.tsx
.select('zone_id, discount_rate')   // cargo_type 자체를 조회하지도 않음
for (const zd of zoneDiscounts) zoneDiscountMap[zd.zone_id] = Number(zd.discount_rate);

// shipper-ups-rates-client.tsx
const getDiscountRate = (zoneId: string): number => zoneDiscountMap[zoneId] ?? 0;
```
Agency 화면과 완전히 동일한 패턴의 결함이 Shipper 화면에도 그대로 존재.

### 4. `src/app/actions/ups/rates-public.ts`
`getPublicWeightTierRates()`/`getPublicFreightMinimums()`의 `product:product_id(product_code, product_name)` join이 **`cargo_type`을 애초에 select하지 않음** — 위 화면들에서 행별로 올바른 cargo_type을 알 방법이 현재 데이터 구조상 없음(선행 수정 필요).

## 실측 확인 (MASTER AIR, cargo_type=DOC 55% / NON_DOC 75%(Z5는 78%))

`policyByZone`/`zoneDiscountMap`은 Supabase 쿼리 결과 배열 순서(비결정적)에 따라 DOC 55% 또는 NON_DOC 75% 둘 중 하나만 각 Zone에 남고, **DOC 상품 행에 NON_DOC 할인율이, 또는 그 반대로 적용되는 조합**이 실제로 발생할 수 있음을 코드로 확인.

## 참고 — freight.ts(실제 요금 계산 엔진)는 이미 정상

DEF-B-038(TASK-B-264, PR#1024)로 `estimateUpsFreight()`의 실제 계산 로직은 이미 정확한 cargo_type 폴백을 적용 중. 이번 결함은 **"조회 화면에 보여지는 참고용 원가 표시"**에 한정되며, 실제 오더 접수 시 청구되는 금액에는 영향 없음. 다만 대리점/화주가 이 화면을 보고 자신의 원가를 오인할 수 있어 High로 분류.

## 수정 방향 (TASK-B-266에 배정)

DEF-B-038에서 이미 검증된 candidateCargoTypes 우선순위 폴백 패턴(구체적 값 우선 → ALL 폴백)을 그대로 재사용:

1. `rates-public.ts` — `getPublicWeightTierRates()`/`getPublicFreightMinimums()`의 product join에 `cargo_type` 추가, `PublicWeightTierRate`/`PublicFreightMinimum` 타입에도 반영
2. `agency-ups-rates-client.tsx` — `PricingPolicy`에 `cargo_type` 추가, `policyByZone`을 `Record<zoneId, Record<cargoType, rate>>` 중첩 구조로 변경, `calcAgencyCost(sellingPrice, zoneId, productCargoType)`로 파라미터 추가 + candidateCargoTypes 폴백 적용. `WeightTierRateTable`/`FreightMinimumTable` 호출부에 `row.original.product?.cargo_type` 전달
3. `UpsBaseRateMatrix.tsx` — `discountRateMap`을 동일하게 중첩 구조로 변경, `getDiscountRate(zoneId, productCargoType)`로 변경(이미 `selectedProduct`가 컴포넌트 스코프에 있어 `selectedProduct?.cargo_type` 바로 사용 가능). `discountRateMap` prop을 쓰는 **모든 호출부**(admin/agency/shipper ups-rates 3곳 전부) 함께 갱신 필요
4. `shipper/ups-rates/page.tsx` — 쿼리에 `cargo_type` 추가, `zoneDiscountMap` 중첩 구조로 변경
5. `shipper-ups-rates-client.tsx` — `getDiscountRate` 동일 패턴 수정

## 회귀 테스트 (필수)

- Agency 화면: DOC/NON_DOC 할인율이 각각 다르게 등록된 상태에서, Express DOC 행은 DOC 할인율을, Express NON_DOC 행은 NON_DOC 할인율을, Expedited/Flight 행은 NON_DOC(있으면)→ALL(폴백) 할인율을 정확히 사용하는지(behavioral, 실제 렌더링된 원가 숫자 검증)
- Shipper 화면 동일 4개 케이스
- ALL만 등록된 기존 대리점(하위 호환)은 모든 상품에 그대로 적용되는지
- **되돌리기 검증 필수** — cargo_type 인지 로직 제거 시 "DOC/NON_DOC 중 하나가 다른 하나를 덮어쓰는" 증상이 실제로 재현되는지 확인 후 결과를 task file에 기재
