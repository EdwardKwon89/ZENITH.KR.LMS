## 11. UPS 특송 요금 관리 (Phase 7.1 — IMP-145 · Phase 7.2 — IMP-146)

> **설계 문서**: An-14_Phase7_UPS요금관리_설계보완.md
> **마지막 갱신**: 2026-07-15 (TASK-184, Issue #491 — 급증 긴급 수수료 §11.11 신규)
> **Team B 인계 범위**: GH #181 (오더 등록 연동 + 정산)
>
> **핵심 계약**: `zen_agency_rate_overrides.cost_price`는 DB 트리거(`trg_agency_rate_override_calc_cost`)가 `base_rate.selling_price × (1 - policy.discount_rate)`로 **서버에서 자동 계산**한다. 클라이언트가 `cost_price` 값을 보내도 **무시**된다. Agency는 `selling_price`(마진 포함)만 입력할 수 있다.

### 11.1 요금 계산 API

#### estimateUpsFreight(input) — Server Action
- **Path**: `src/app/actions/ups/freight.ts`
- **설명**: UPS 운송 요금을 3단계(Platform/Agency/Shipper)로 계산하여 반환. 오더 등록 화면에서 실시간 견적 표시용.
- **Input** (`EstimateUpsFreightInput`):
  - `productId: string` — UPS 제품 ID
  - `destCountryCode: string` — 목적지 국가코드 (ISO alpha-3)
  - `actualWeightKg: number` — 실중량
  - `dimL/dimW/dimH?: number` — 가로/세로/높이(cm)
  - `incoterms?: 'DDU' | 'DDP'`
  - `volumetricDivisor?: 5000 | 5500 | 6000`
  - `otherChargeIds?: string[]` — 적용할 부가요금 ID 목록
  - `agencyOrgId?: string | null` — 대리점 org_id (null이면 Agency/Shipper 단계 생략)
  - `shipperOrgId?: string | null` — 화주 org_id (null이면 Shipper 단계 생략)
  - `referenceDate?: string` — 기준일자 (YYYY-MM-DD, 미전달 시 오늘)
  - `direction?: string` — **(GH#202 신규)** Zone 조회 방향. `'EXPORT' | 'IMPORT'`, 기본값 `'EXPORT'`. 내부적으로 `resolveZoneByCountry()`에 전달됨.
- **Output** (`UpsFreightEstimate`):
  - `platform: UpsFreightResult` — Platform 단계 (기준요금 + 유류할증 + OC)
  - `agency: UpsAgencyFreightResult | null` — Agency 단계 (할인율 적용 + 마진)
  - `shipper: UpsShipperFreightResult | null` — Shipper 단계 (화주 할인율 적용)
- **Output 상세** (`UpsFreightResult.breakdown`, GH#202/IMP-146 신규 필드 포함):
  - `fallbackApplied: boolean` — Zone이 정확매치가 아닌 EXPRESS/EXPORT fallback으로 결정됐는지 여부 (11.6 참조)
  - `dwbApplied: boolean`, `dwbOriginalWeightKg?`, `dwbOriginalSellingPrice?`, `dwbOriginalCostPrice?` — DWB 적용 여부 및 적용 전 원본값 (11.7 참조)
  - `freightMinApplied: boolean`, `freightMinOriginalSelling?`, `freightMinOriginalCost?` — Freight 최소운임 적용 여부 및 적용 전 원본값 (11.8 참조)
  - `surgeFeeId: string | null`, `surgeFeeSellingRatePerKg: number`, `surgeFeeSellingAmount: number`, `surgeFeeCostAmount: number` — 급증 긴급 수수료 적용 내역 (11.11 참조)

**동작 분기**:
- `agencyOrgId` 미전달 → Platform 단계만 계산, agency/shipper는 null
- `agencyOrgId` 전달 + `shipperOrgId` 미전달 → Platform + Agency 단계 계산
- `agencyOrgId` + `shipperOrgId` 전달 → 3단계 전부 계산

### 11.2 Admin 요율 CRUD Actions

- **Path**: `src/app/actions/ups/rates-mutation.ts`
- **인증**: ADMIN / MANAGER / ZENITH_SUPER_ADMIN만 접근 가능 (`requireAdminOrManager()`)

| Action | 설명 |
|:-------|:-----|
| `createUpsZone(data)` | Zone 신규 등록 |
| `updateUpsZone(id, data)` | Zone 정보 수정 |
| `deleteUpsZone(id)` | Zone 비활성화 |
| `addZoneCountry(zoneId, countryCode)` | Zone에 국가 매핑 추가 |
| `removeZoneCountry(id)` | Zone 국가 매핑 제거 |
| `createUpsProduct(data)` | 제품 신규 등록 |
| `updateUpsProduct(id, data)` | 제품 정보 수정 |
| `upsertUpsBaseRate(data)` | 기준요금 등록/수정 (unique: product_id+zone_id+weight_kg+valid_from) |
| `upsertUpsFuelSurcharge(data)` | 유류할증료 등록/수정 (unique: product_id+effective_week) |
| `createUpsOtherCharge(data)` | 부가요금 코드 신규 등록 |
| `updateUpsOtherCharge(id, data)` | 부가요금 정보 수정 |
| `deleteUpsOtherCharge(id)` | 부가요금 비활성화 |
| `upsertAgencyPricingPolicy(data)` | 대리점 할인율 정책 등록/수정 (unique: agency_org_id) |
| `getAgencyPricingPolicy(agencyOrgId)` | 대리점 할인율 정책 조회 |
| `createUpsSurgeFee(data)` | 급증 긴급 수수료 신규 등록 (11.11 참조) |
| `updateUpsSurgeFee(id, data)` | 급증 긴급 수수료 수정 |
| `deleteUpsSurgeFee(id)` | 급증 긴급 수수료 비활성화 |

### 11.3 Agency 요율 Actions

- **Path**: `src/app/actions/agency/rate-overrides.ts`
- `getAgencyRateOverrides(agencyOrgId)` — Agency 요율 오버라이드 목록
- `upsertAgencyRateOverride(agencyOrgId, data)` — 오버라이드 등록/수정. **`cost_price`는 서버 트리거가 자동 계산 → 클라이언트 전송값 무시**
- `deactivateAgencyRateOverride(id)` — 오버라이드 비활성화

- **Path**: `src/app/actions/agency/other-charges.ts` (신규)
- `getAgencyOtherCharges(agencyOrgId)` — Agency별 부가요금 목록
- `upsertAgencyOtherCharge(agencyOrgId, data)` — 부가요금 등록/수정
- `deactivateAgencyOtherCharge(id)` — 부가요금 비활성화

### 11.4 DB 함수 (Security Definer)

#### `fn_get_ups_agency_selling_price(agency_org_id, base_rate_id)`
- **설명**: 화주 세션이 Agency의 `cost_price`나 `discount_rate`를 보지 않고 `selling_price`만 조회. `SECURITY DEFINER`로 실행되어 RLS 우회.
- **호출 권한**: `service_role`, ADMIN/MANAGER, 해당 Agency 본인, 또는 해당 Agency 소속 화주

#### `fn_get_ups_agency_other_charge_price(agency_org_id, other_charge_id)`
- **설명**: Agency 부가요금 판매가 조회 (동일 보안 모델)

### 11.5 Team B 인계 계약 (GH #181)

Team A가 제공하는 API 계약 — Team B가 오더 등록 화면 연동 시 그대로 소비:

| 항목 | Team A 제공 | Team B 소비 |
|:-----|:-----------|:-----------|
| 요금 계산 API | `estimateUpsFreight()` Action 노출 | 오더 등록 화면에서 호출하여 실시간 견적 표시 |
| 오더-Agency 연결 | — | `zen_orders.agency_org_id` 저장 (`zen_agency_shippers` 조회) |
| 요율 스냅샷 저장 | — | 오더 확정 시 `zen_order_rate_snapshots` 기록 |
| 정산 분리 | — | 화주→Agency, Agency→플랫폼 청구 구분 |
| RBAC AGENCY 격리 | 기존 RLS 활용 | AGENCY 화주 역할이 본인 소속 요율만 노출되도록 적용 |

### 11.6 Zone 해석 & 중량 반올림 (Pricing Engine 유틸)

- **Path**: `src/lib/ups/pricing-engine.ts`

#### resolveZoneByCountry(destCountryCode, zones, productFamily?, direction?)
- **설명**: 목적지 국가코드로 Zone을 탐색. 2단계 Fallback 구조.
  1. 정확매치: `(country_code, product_family, direction)` 3개 조건 모두 일치
  2. Fallback: 1단계 실패 시 `EXPRESS/EXPORT` 조합으로 재탐색 (모든 국가에 보장되는 유일한 조합)
  3. 둘 다 실패 시 `zone: null` 반환 (호출자가 에러 처리)
- **Input**: `destCountryCode: string`, `zones: UpsZoneWithCountries[]`, `productFamily: string = 'EXPRESS'`, `direction: string = 'EXPORT'`
- **Output** (`ZoneResolveResult`): `{ zone: UpsZone | null, fallbackApplied: boolean }`
- **호출처**: `estimateUpsFreight()` — GH#202 이전에는 이 함수를 호출하지 않고 `freight.ts` 내부에 별도의 inline 매칭 로직이 있었으나(Zone 정밀화 무효화 결함), GH#202에서 정식 연동 완료.

#### productFamilyFromCode(productCode)
- **설명**: UPS `product_code` → `zen_ups_zone_countries.product_family` 값(`EXPRESS`/`SAVER`/`EXPEDITED`/`FREIGHT`) 매핑. `resolveZoneByCountry()` 호출 전 `productFamily` 인자를 구하는 데 사용.
- **매핑 규칙**: `WW_EXPRESS*→EXPRESS`, `WW_EXPEDITED→EXPEDITED`, `WW_SAVER*→SAVER`, `WW_FLIGHT*→FREIGHT`. 매칭되는 prefix가 없으면 기본값 `EXPRESS`.

#### resolveBillingWeight(chargeableKg, productCode) — DEF-095 Hotfix
- **설명**: 청구중량을 요율표 조회 단위로 반올림. UPS 공식 Rate Guide 기준 상품별 반올림 단위가 다름.
- **규칙**: `WW_EXPEDITED`는 중량과 무관하게 항상 **1kg** 단위 올림. 그 외 전 상품은 20kg 이하 **0.5kg** 단위, 20kg 초과 **1kg** 단위로 올림.
- **배경**: 최초 구현 시 전 상품에 0.5kg 단위를 일괄 적용했던 결함(DEF-095)을 수정하며 신설.

### 11.7 20kg 초과 Tier 요금 · DWB (Deficit Weight Billing)

- **Path**: `src/lib/ups/pricing-engine.ts` (`computeUpsFreight()` 내부 로직), 요율 테이블 `zen_ups_weight_tier_rates`

#### zen_ups_weight_tier_rates (테이블)
- **설명**: 20kg 초과 화물에 적용되는 **구간별 kg당 단가** 요율. 20kg 이하는 기존 `zen_ups_base_rates`(중량별 flat 요금)를 그대로 사용하고, 초과분만 이 테이블로 전환.
- **주요 컬럼**: `product_id`, `zone_id`, `tier_min_kg`(구간 하한), `tier_max_kg`(구간 상한, 최상위 구간은 `NULL`), `price_per_kg_selling`, `price_per_kg_cost`, `valid_from/until`, `is_active`
- **Unique 제약**: `(product_id, zone_id, tier_min_kg, valid_from)`

#### DWB(Deficit Weight Billing) 로직
- **설명**: 현재 중량 구간의 요금이, 바로 다음 상위 구간의 **최소중량 기준 요금**보다 비싼 경우(중량 구간 경계에서 실중량이 적을수록 오히려 더 비싸지는 역전 현상) 다음 구간 요금으로 대체 청구.
- **판정식**: `nextTier.tier_min_kg × nextTier.price_per_kg_selling < currentSellingPrice` 이면 DWB 적용 — `billingWeightKg`를 `nextTier.tier_min_kg`로, `baseSellingPrice`/`baseCostPrice`를 다음 구간 기준으로 교체.
- **적용 범위**: 20kg 이하(⇄ 첫 per-kg 구간 경계)와 20kg 초과 구간 간 경계 모두에서 동작.
- **Output 필드** (`UpsFreightResult` / `UpsBreakdown`): `dwbApplied: boolean`, `dwbOriginalWeightKg`, `dwbOriginalSellingPrice`, `dwbOriginalCostPrice` — DWB 적용 전 원본값을 보존하여 화면에 "원래 청구 예정이었던 값" 표시 가능.

### 11.8 Freight 최소운임 (Flat Floor)

- **Path**: `src/lib/ups/pricing-engine.ts` (`computeUpsFreight()` 4단계), 요율 테이블 `zen_ups_freight_minimums`

#### zen_ups_freight_minimums (테이블)
- **설명**: `WW_FLIGHT`(Freight) 계열 상품에 한해 Zone별 **최소 청구 운임**(flat floor)을 강제. Tier 계산 결과가 이 값보다 낮으면 최소운임으로 대체.
- **주요 컬럼**: `zone_id`, `product_id`, `min_charge_selling`, `min_charge_cost`, `is_active`
- **Unique 제약**: `(zone_id, product_id)` — Zone·상품 조합당 1건
- **적용 로직**: `baseSellingPrice < min_charge_selling` 이면 `baseSellingPrice = min_charge_selling`으로 교체(코스트도 동일 로직 별도 적용). selling/cost 각각 독립적으로 판정.
- **Output 필드**: `freightMinApplied: boolean`, `freightMinOriginalSelling`, `freightMinOriginalCost` — 최소운임 적용 전 원본값 보존.

### 11.9 Box 상품 (UPS_10KG_BOX / UPS_25KG_BOX)

- **Path**: 마이그레이션 `20260705120000_imp146_ups_products_box_max_weight.sql`
- **설명**: UPS의 정액 박스 상품 2종. 일반 상품과 달리 `zen_ups_products.max_weight_kg` 컬럼으로 상한 중량이 고정됨(`UPS_10KG_BOX`=10kg, `UPS_25KG_BOX`=25kg).
- **요율 저장 방식**: 별도 API·로직 분기 없이 기존 `zen_ups_base_rates`(제품×Zone×1kg 단위 weight_kg) 구조를 그대로 사용 — `estimateUpsFreight()` 계산 경로는 일반 상품과 동일하다. `max_weight_kg`는 현재 소스코드 어디에서도 참조되지 않는 메타데이터 컬럼(참고용 시딩)이며, 실중량이 상한을 초과해도 서버측에서 별도로 차단하지 않는다 — 개선 필요 여부는 후속 검토 대상(본 이슈 범위 밖).
- **Zone 범위**: Z1(국내) 제외, Z2~Z10에 대해서만 요율 시드.

### 11.10 UPS 용어 정의 (Glossary)

| 용어 | 영문 | 정의 | 사용처 |
|:----|:----|:----|:------|
| 부피 할증 | Oversize Rule | 일정 기준 초과 포장물에 추가 요금을 부과하는 룰. `applyOversizeRule()` 함수로 구현됨. | `pricing-engine.ts` |
| 유류 할증 | Fuel Surcharge | 유가 변동에 따른 할증료. `zen_ups_fuel_surcharges` 테이블 기준, 판매가/원가 각각 비율 적용. | `pricing-engine.ts` |
| 부가요금 | Other Charges | DDU/DDP/OVERSIZE 등 건별 부가 비용. `unit: 'PKG' | 'KG' | 'LOT'` 단위로 설정. 배송 건수 곱 적용은 미구현(GH#206 #10 참조). | `freight.ts`, `agency-pricing.ts` |
| DWB | Deficit Weight Billing | 청구 중량 부족분 보전 로직. 20kg 초과 구간에서 현재 중량 vs 다음 티어 최소 중량 차이를 비교하여 더 큰 쪽으로 청구. `dwbApplied` 필드로 추적. | `pricing-engine.ts` |
| 최소운임 | Freight Minimum | WW_FLIGHT 상품에만 적용되는 최소 청구 금액. `zen_ups_freight_minimums` 테이블 참조. | `freight.ts` |
| SHXK 국가매핑 | SHXK Country Map | UPS 라벨 발급용 SHXK 코드 매핑 테이블(`zen_ups_shxk_country_map`). 요율 계산과 무관. | `ups-labels.ts` |
| Zone 국가매핑 | Zone Country Map | Zone 기반 요율 계산용 국가 매핑 테이블(`zen_ups_zone_countries`). SHXK 매핑과 목적 및 관리 주체가 다름. | `freight.ts`, `rates.ts` |

### 11.11 급증 긴급 수수료 (Surge Emergency Fee, Issue #491, TASK-184)

> **근거 자료**: `docs/80_RawData/UPS 급증 수수료.pdf`(UPS 공식 안내), `docs/80_RawData/20260609 SNTL 자료/sntl_ups.txt`(13행). Jungjs(Team B) 검토 확인(Issue #491).

- **DB**: `zen_ups_surge_fees` — 출발지는 한국 고정(ZENITH는 한국 발송 전용)이므로 출발지 컬럼 없음. 도착국(`destination_country_code`, ISO alpha-3) × 적용기간(`effective_from`~`effective_until`)별로 **kg당 단가**(`selling_rate_per_kg`/`cost_rate_per_kg`)를 관리.
- **계산식** (`pricing-engine.ts` `applySurgeFee()`):
  ```
  surgeFeeSellingAmount = selling_rate_per_kg × chargeableKg × (1 + fuelSurchargeRate)
  surgeFeeCostAmount    = cost_rate_per_kg × chargeableKg × (1 + fuelSurchargeCostRate)
  ```
  유류할증료가 항상 추가 부과되는 항목(SNTL 자료·UPS 공식 PDF 확인).
- **조회**: `freight.ts`가 `destCountryCode`+기준일(`referenceDate`) 기준 유효한 단가 1건을 조회해 `UpsPricingData.surgeFee`로 전달. 조회 결과 없으면 0원 처리(하위 호환).
- **총액 반영**: `UpsFreightResult.totalSellingPrice`/`totalCostPrice`에 자동 합산. Agency 단계는 `platformSellingTotal` 그대로 상속. Shipper 단계는 기타 부가요금과 동일하게 **할인 미적용 pass-through**(`computeShipperFreight` 5번째 인자).
- **Admin CRUD**: `rates-mutation.ts`의 `createUpsSurgeFee`/`updateUpsSurgeFee`/`deleteUpsSurgeFee` (11.2 참조), `/admin/ups-rates` "급증 수수료" 탭.
- **운영 프로세스**: UPS 공지(PDF/URL) 수신 시 관리자가 Admin UI에서 직접 등록. URL 기반 AI 자동 파싱은 Jungjs 제안 — 후속 개선 과제로 분리(이번 스코프 아님).

