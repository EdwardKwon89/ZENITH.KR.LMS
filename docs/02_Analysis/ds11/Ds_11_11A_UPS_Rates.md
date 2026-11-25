## 11. UPS 특송 요금 관리 (Phase 7.1 — IMP-145 · Phase 7.2 — IMP-146)

> **설계 문서**: An-14_Phase7_UPS요금관리_설계보완.md
> **마지막 갱신**: 2026-11-25 (TASK-B-373 PR-2 — 요율 조회 6종 역할 가드·견적 응답 DTO)
> **Team B 인계 범위**: GH #181 (오더 등록 연동 + 정산)
>
> **핵심 계약**: `zen_agency_rate_overrides.cost_price`는 DB 트리거(`trg_agency_rate_override_calc_cost`)가 `base_rate.selling_price × (1 - policy.discount_rate)`로 **서버에서 자동 계산**한다. 클라이언트가 `cost_price` 값을 보내도 **무시**된다. Agency는 `selling_price`(마진 포함)만 입력할 수 있다.

### 11.1 요금 계산 API

#### estimateUpsFreight(input) — Server Action (세션 진입점)
- **Path**: `src/app/actions/ups/freight.ts` (세션 진입점) · `src/lib/ups/estimate-core.ts` (전체 계산, server-only)
- **설명**: UPS 운송 요금을 3단계(Platform/Agency/Shipper)로 계산합니다. **세션 역할·소속으로 계산 범위를 서버에서 결정**하고, 허용된 단계만 DTO로 반환합니다. 오더 등록 화면에서 실시간 견적 표시용이며, 내부 서버 호출자(오더·스냅샷·실비 재계산)는 코어를 직접 사용합니다.
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
- **Output** (`UpsFreightEstimate` DTO):
  - `platform` — 중량·통화·breakdown. **원가 계열은 관리자에게만**, 플랫폼 판매가 계열은 관리자·대리점·비소속 화주에게만 포함(소속 화주는 미포함)
  - `agency: UpsAgencyFreightResult | null` — 관리자·대리점(자기 단계)에만 포함
  - `shipper: UpsShipperFreightResult | null` — 관리자·대리점(소속 화주 범위)·소속 화주에만 포함
- **Output 상세** (`UpsFreightResult.breakdown`, GH#202/IMP-146 신규 필드 포함):
  - `fallbackApplied: boolean` — Zone이 정확매치가 아닌 EXPRESS/EXPORT fallback으로 결정됐는지 여부 (11.6 참조)
  - `dwbApplied: boolean`, `dwbOriginalWeightKg?`, `dwbOriginalSellingPrice?`, `dwbOriginalCostPrice?` — DWB 적용 여부 및 적용 전 원본값 (11.7 참조)
  - `freightMinApplied: boolean`, `freightMinOriginalSelling?`, `freightMinOriginalCost?` — Freight 최소운임 적용 여부 및 적용 전 원본값 (11.8 참조)
  - `surgeFeeId: string | null`, `surgeFeeSellingRatePerKg: number`, `surgeFeeSellingAmount: number`, `surgeFeeCostAmount: number` — 급증 긴급 수수료 적용 내역 (11.11 참조)

**동작 분기 (서버가 세션으로 결정)**:
- 관리자(ADMIN·MANAGER·ZENITH_SUPER_ADMIN): 입력 범위 그대로 계산, 원가 포함 전체 반환
- 대리점(AGENCY): `agencyOrgId`는 세션 org로 고정, `shipperOrgId`는 **소속 검증 통과 시에만** 사용(미소속 지정은 거부)
- 화주 계열(SHIPPER·CORPORATE·AGENCY_SHIPPER): `shipperOrgId`는 세션 org로 고정, `agencyOrgId`는 서버가 소속 조회로 결정
- INDIVIDUAL(org 없음): 플랫폼 판매가만
- OPERATOR: 입력 화주 기준으로 계산하되 원가 미포함
- 소속 화주: 플랫폼 판매가(1단계) 미전달, 자기 청구 단계만. 부가항목 행은 화주 청구 단계와 동일 금액이라 포함
- 비소속 화주: 플랫폼 판매가만 전달(대리점·화주 단계 없음)
- 소속 조회 오류·다중 소속: **소속 미확정으로 거부(fail-closed)** — 비소속 폴백 없음
- 견적 화면 경로가 없는 역할(SUB_ADMIN·CARRIER·CUSTOMS_BROKER·DELIVERY_AGENT·USER): `permission_denied`

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

- **Path**: `src/app/actions/agency/other-charges.ts`
- `getAgencyOtherCharges(agencyOrgId)` — Agency별 부가요금 목록
  - **권한**: `validateUserAction` + `checkPermission('/agency')` + **소유권 검증**(`agencyOrgId === profile.org_id`, `ZENITH_SUPER_ADMIN` 예외). 거부 시 `own_agency_only`(4로케일) + `logger.warn`.
- `upsertAgencyOtherCharge(agencyOrgId, data)` — 부가요금 등록/수정
  - **권한**: 위와 동일. **쓰기 전에** `agencyOrgId`를 `profile.org_id`와 비교해 타 대리점 명의 변경을 차단.
- `deactivateAgencyOtherCharge(id)` — 부가요금 비활성화
  - **권한**: 위와 동일. **선조회**로 대상 행의 `agency_org_id`를 확인한 뒤 `update … eq('id').eq('agency_org_id', row.agency_org_id)` 조건부 UPDATE로 이중 방어.

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


### 11.15 UPS 요율·원가 마스터 조회 Actions (`src/app/actions/ups/rates.ts` — TASK-1164 / Issue #1360)

#### getUpsZones()
- **Path**: `src/app/actions/ups/rates.ts:18-27`
- **설명**: 활성 상태(`is_active = true`)인 UPS Zone 목록(`zen_ups_zones`)과 각 Zone에 매핑된 국가 목록(`countries:zen_ups_zone_countries(*)`)을 `sort_order` 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates.ts:19`, 로그인 세션만 검증하며 별도 역할 가드 없음 — DB RLS `ups_zones_authenticated_select` 및 `ups_zone_countries_authenticated_select`로 인증 사용자 전체 조회 허용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<UpsZoneWithCountries[]>` (`src/types/ups.ts:29-31`, `zones ?? []`)
- **오류**: 미인증/프로필 부재 시 `validateUserAction()`에서 `Error("Login required")` / `Error("Profile not found")` throw (`guards.ts:44-65`); DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:25`)

#### getUpsProducts(cargoType?)
- **Path**: `src/app/actions/ups/rates.ts:29-39`
- **설명**: 활성 상태(`is_active = true`)인 UPS 서비스 상품 목록(`zen_ups_products`)을 조회하며, `cargoType` 전달 시 해당 화물 유형(`'DOC' | 'NON_DOC' | 'BOTH'`)으로 필터링하여 `sort_order` 오름차순으로 반환합니다.
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates.ts:30`, 로그인 세션만 검증 — DB RLS `ups_products_authenticated_select` 적용)
- **Input**: `cargoType?: UpsCargoType` (`'DOC' | 'NON_DOC' | 'BOTH'`, 선택, `src/types/ups.ts:4`)
- **Output**: `Promise<UpsProduct[]>` (`src/types/ups.ts:33-45`, `data ?? []`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:37`)

#### getUpsBaseRates(filters?)
- **Path**: `src/app/actions/ups/rates.ts:41-67`
- **설명**: 기준일(`referenceDate`, 미전달 시 오늘 `YYYY-MM-DD`)에 유효하고 활성 상태(`is_active = true`)인 UPS 기준요금(`zen_ups_base_rates`, 판매가 `selling_price` 및 원가 `cost_price` 포함, `product`·`zone` 조인)을 `fetchAllRows`(1,000행 단위 페이지네이션, `weight_kg`·`id` 정렬)로 전수 조회합니다.
- **권한**: `validateUserAction()` + `assertRatesReadAccess('base')` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN·SUB_ADMIN**만 허용, 그 외는 `permission_denied`(TASK-B-373 PR-2 / DEF-151)
- **Input**: `filters?: { productId?: string; zoneId?: string; referenceDate?: string }` (모두 선택; `referenceDate`는 `YYYY-MM-DD`, 기본값 오늘)
- **Output**: `Promise<UpsBaseRateWithRefs[]>` (`src/types/ups.ts:47-65`, 통화 기본 `'KRW'`, 중량 0.5kg 단위)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 페이지네이션 쿼리 실패 시 `fetchAllRows`에서 `Error(error?.message ?? 'query failed')` throw (`src/lib/ups/paginate-all.ts:19`)

#### getUpsFuelSurcharge(productId?, referenceDate?)
- **Path**: `src/app/actions/ups/rates.ts:69-85`
- **설명**: 기준일(`referenceDate`, 기본값 오늘) 이전(`effective_week <= refDate`)의 가장 최근 UPS 유류할증료율(`zen_ups_fuel_surcharges`, `selling_rate`·`cost_rate` 비율 포함) 단건을 조회합니다 (`productId` 전달 시 해당 상품 또는 공통 `product_id IS NULL` 조건 매칭).
- **권한**: `validateUserAction()` + `assertRatesReadAccess('admin')` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만 허용(TASK-B-373 PR-2 / DEF-151)
- **Input**: `productId?: string | null` (UPS 상품 UUID, 선택), `referenceDate?: string` (`YYYY-MM-DD`, 기본값 오늘)
- **Output**: `Promise<UpsFuelSurcharge | null>` (`src/types/ups.ts:67-75`, `data?.[0] ?? null`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:83`)

#### getUpsOtherCharges()
- **Path**: `src/app/actions/ups/rates.ts:87-96`
- **설명**: 활성 상태(`is_active = true`)인 UPS 공통 부가요금 목록(`zen_ups_other_charges`, `selling_price`·`cost_price`·`unit`·`fuel_surcharge_applicable` 포함)을 `charge_code` 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` + `assertRatesReadAccess('admin')` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만 허용. `/agency/other-charges`는 공개 판매가 조회(`getPublicOtherCharges`)로 전환(TASK-B-373 PR-2 / DEF-151)
- **Input**: 없음 (`()`)
- **Output**: `Promise<UpsOtherCharge[]>` (`src/types/ups.ts:77-89`, `data ?? []`, 통화 기본 `'KRW'`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:94`)

#### getUpsSurgeFees()
- **Path**: `src/app/actions/ups/rates.ts:99-108`
- **설명**: Admin 관리 화면용으로 도착국별 UPS 급증 긴급 수수료 전체 이력(`zen_ups_surge_fees`, 과거 기간 포함, `selling_rate_per_kg`·`cost_rate_per_kg` 포함)을 `destination_country_code` 오름차순·`effective_from` 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` + `assertRatesReadAccess('admin')` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만 허용(관리 이력 조회, TASK-B-373 PR-2 / DEF-151)
- **Input**: 없음 (`()`)
- **Output**: `Promise<UpsSurgeFee[]>` (`src/types/ups.ts:107-118`, `data ?? []`, kg당 단가, 통화 기본 `'KRW'`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:106`)

#### getUpsWeightTierRates()
- **Path**: `src/app/actions/ups/rates.ts:110-119`
- **설명**: 활성 상태(`is_active = true`)인 20kg 초과 구간별 kg당 단가 요율 목록(`zen_ups_weight_tier_rates`, `price_per_kg_selling`·`price_per_kg_cost` 및 `product`·`zone` 조인 포함)을 `tier_min_kg` 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` + `assertRatesReadAccess('admin')` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만 허용(TASK-B-373 PR-2 / DEF-151)
- **Input**: 없음 (`()`)
- **Output**: `Promise<UpsWeightTierRateWithRefs[]>` (`src/types/ups.ts:275-290, 305-308`, `data ?? []`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:117`)

#### getUpsFreightMinimums()
- **Path**: `src/app/actions/ups/rates.ts:121-129`
- **설명**: 활성 상태(`is_active = true`)인 Freight 상품 최소 청구 운임 목록(`zen_ups_freight_minimums`, `min_charge_selling`·`min_charge_cost` 및 `product`·`zone` 조인 포함)을 조회합니다.
- **권한**: `validateUserAction()` + `assertRatesReadAccess('admin')` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만 허용(TASK-B-373 PR-2 / DEF-151)
- **Input**: 없음 (`()`)
- **Output**: `Promise<UpsFreightMinimumWithRefs[]>` (`src/types/ups.ts:292-303, 310-313`, `data ?? []`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates.ts:127`)

### 11.16 UPS 요율·대리점 정책·부피계수 변경 Actions (`src/app/actions/ups/rates-mutation.ts` — TASK-1164 / Issue #1360)

#### upsertAgencyCostRate(data)
- **Path**: `src/app/actions/ups/rates-mutation.ts:124-156`
- **설명**: 기존 등록된 UPS 기준요금 행(`zen_ups_base_rates`, `product_id + zone_id + weight_kg + valid_from` 일치)을 찾아 원가(`cost_price`)와 `updated_at`만 수정합니다 (Issue #618, Master Agency `SUB_ADMIN` 원가 편집 지원).
- **권한**: `validateUserAction()` + `requireAdminManagerOrSubAdmin(role)` — 공용 가드 `src/lib/auth/ups-rate-permissions.ts` (허용 역할: `ADMIN`, `MANAGER`, `ZENITH_SUPER_ADMIN`, `SUB_ADMIN`) + `createAdminClient()`(service_role로 `zen_ups_base_rates` RLS 우회 업데이트, `L134`)
- **Input**: `data: { product_id: string; zone_id: string; weight_kg: number; valid_from: string; cost_price: number }`
- **Output**: `Promise<void>`
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 역할 불충족 시 `Error("Agency 원가 할인율 관리 권한이 없습니다.")` throw (`L19`); 대상 기준요금 미존재 또는 조회 실패 시 `Error("해당 기준요금을 찾을 수 없습니다. 기준요금이 먼저 등록되어야 합니다.")` throw (`L145-147`); DB 업데이트 실패 시 `Error(updateError.message)` throw (`L154`)
- **부수효과**: `zen_ups_base_rates.cost_price` 업데이트(`L149-152`), `revalidatePath('/admin/ups-rates')` (`L155`)

#### getAgencyPricingPolicies(agencyOrgId?)
- **Path**: `src/app/actions/ups/rates-mutation.ts:255-265`
- **설명**: 활성 상태(`is_active = true`)인 대리점별 UPS Zone 할인율 정책 목록(`zen_agency_pricing_policies`, `agency:agency_org_id(name)`·`zone:zone_id(zone_code, zone_name)` 조인)을 `agency_org_id` 오름차순으로 조회합니다 (`agencyOrgId` 전달 시 해당 대리점으로 필터링).
- **권한**: `validateUserAction()` + `requireAdminManagerOrSubAdmin(role)` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN·SUB_ADMIN**만 허용(TASK-B-373 PR-2). 행 범위는 DB RLS(`agency_pricing_policies_admin_all`·`agency_pricing_policies_sub_admin_scoped`·`agency_pricing_policies_agency_select`)가 담당
- **Input**: `agencyOrgId?: string` (대리점 조직 UUID, 선택)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`zen_agency_pricing_policies` 행 + `agency`·`zone` 조인 배열, `data ?? []`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates-mutation.ts:263`)

#### upsertUpsWeightTierRate(data)
- **Path**: `src/app/actions/ups/rates-mutation.ts:290-312`
- **설명**: 20kg 초과 구간별 kg당 단가 요율(`zen_ups_weight_tier_rates`)을 `onConflict: 'product_id,zone_id,tier_min_kg,valid_from'` 기준으로 Upsert합니다 (`currency` 기본값 `'KRW'`).
- **권한**: `validateUserAction()` + `requireAdminOrManager(profile?.role)` (`rates-mutation.ts:9-13, 303-304`, 허용 역할: `ADMIN`, `MANAGER`, `ZENITH_SUPER_ADMIN`)
- **Input**: `data: { id?: string; product_id: string; zone_id: string; tier_min_kg: number; tier_max_kg?: number | null; price_per_kg_selling: number; price_per_kg_cost: number; currency?: string; valid_from: string; valid_until?: string | null; is_active?: boolean }`
- **Output**: `Promise<void>`
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 역할 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw (`L11`); DB Upsert 실패 시 `Error(error.message)` throw (`L310`)
- **부수효과**: `zen_ups_weight_tier_rates` 행 Upsert(`L305-309`), `revalidatePath('/admin/ups-rates')` (`L311`)

#### deleteUpsWeightTierRate(id)
- **Path**: `src/app/actions/ups/rates-mutation.ts:314-323`
- **설명**: 지정한 중량 구간 요율 행(`zen_ups_weight_tier_rates.id`)을 소프트 삭제(`is_active = false`, `updated_at` 갱신)합니다.
- **권한**: `validateUserAction()` + `requireAdminOrManager(profile?.role)` (`rates-mutation.ts:315-316`, 허용 역할: `ADMIN`, `MANAGER`, `ZENITH_SUPER_ADMIN`)
- **Input**: `id: string` (`zen_ups_weight_tier_rates.id` UUID)
- **Output**: `Promise<void>`
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 역할 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw (`L11`); DB 업데이트 실패 시 `Error(error.message)` throw (`L321`)
- **부수효과**: `zen_ups_weight_tier_rates.is_active = false` 업데이트(`L317-320`), `revalidatePath('/admin/ups-rates')` (`L322`)

#### upsertUpsFreightMinimum(data)
- **Path**: `src/app/actions/ups/rates-mutation.ts:327-345`
- **설명**: Freight 상품 최소 청구 운임(`zen_ups_freight_minimums`)을 `onConflict: 'product_id,zone_id'` 기준으로 Upsert합니다 (`currency` 기본값 `'KRW'`).
- **권한**: `validateUserAction()` + `requireAdminOrManager(profile?.role)` (`rates-mutation.ts:336-337`, 허용 역할: `ADMIN`, `MANAGER`, `ZENITH_SUPER_ADMIN`)
- **Input**: `data: { id?: string; zone_id: string; product_id: string; min_charge_selling: number; min_charge_cost: number; currency?: string; is_active?: boolean }`
- **Output**: `Promise<void>`
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 역할 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw (`L11`); DB Upsert 실패 시 `Error(error.message)` throw (`L343`)
- **부수효과**: `zen_ups_freight_minimums` 행 Upsert(`L338-342`), `revalidatePath('/admin/ups-rates')` (`L344`)

#### deleteUpsFreightMinimum(id)
- **Path**: `src/app/actions/ups/rates-mutation.ts:347-356`
- **설명**: 지정한 Freight 최소운임 행(`zen_ups_freight_minimums.id`)을 소프트 삭제(`is_active = false`, `updated_at` 갱신)합니다.
- **권한**: `validateUserAction()` + `requireAdminOrManager(profile?.role)` (`rates-mutation.ts:348-349`, 허용 역할: `ADMIN`, `MANAGER`, `ZENITH_SUPER_ADMIN`)
- **Input**: `id: string` (`zen_ups_freight_minimums.id` UUID)
- **Output**: `Promise<void>`
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 역할 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw (`L11`); DB 업데이트 실패 시 `Error(error.message)` throw (`L354`)
- **부수효과**: `zen_ups_freight_minimums.is_active = false` 업데이트(`L350-353`), `revalidatePath('/admin/ups-rates')` (`L355`)

#### updateAgencyVolumetricDivisor(agencyOrgId, volumetricDivisor)
- **Path**: `src/app/actions/ups/rates-mutation.ts:360-373`
- **설명**: 대리점 조직(`zen_organizations.id = agencyOrgId`)의 UPS 부피중량 제수(`volumetric_divisor`)를 `5000`, `5500`, `6000` 중 하나로 업데이트합니다 (Issue #312).
- **권한**: `validateUserAction()` + `requireAdminOrManager(profile?.role)` (`rates-mutation.ts:364-365`, 허용 역할: `ADMIN`, `MANAGER`, `ZENITH_SUPER_ADMIN`)
- **Input**: `agencyOrgId: string` (대리점 조직 UUID), `volumetricDivisor: 5000 | 5500 | 6000`
- **Output**: `Promise<{ success: true }>` (`rates-mutation.ts:372`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 역할 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw (`L11`); DB 업데이트 실패(CHECK 제약 위반 등) 시 `Error(error.message)` throw (`L370`)
- **부수효과**: `zen_organizations.volumetric_divisor` 업데이트(`L366-369`), `revalidatePath('/admin/ups-rates')` (`L371`)

### 11.17 UPS 공개 판매가 조회 Actions — 원가 제외 (`src/app/actions/ups/rates-public.ts` — TASK-1164 / Issue #1360)

#### getPublicBaseRates()
- **Path**: `src/app/actions/ups/rates-public.ts:20-38`
- **설명**: Agency·화주 요율표 화면용으로 원가(`cost_price`) 컬럼을 제외하고 오늘(`refDate`) 기준 유효·활성 상태(`is_active = true`)인 UPS 기준요금 판매가 목록(`zen_ups_base_rates`, `product`·`zone` 조인)을 `fetchAllRows`(1,000행 페이지네이션, `weight_kg`·`id` 정렬)로 전수 조회합니다 (TASK-B-091).
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates-public.ts:21`, 로그인 세션 검증 — DB RLS `ups_base_rates_admin_all`·`agency_select`·`shipper_select`·`sub_admin_select` 적용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<PublicBaseRate[]>` (`rates-public.ts:7-18`, `selling_price`·`currency`·`weight_kg`·`product`·`zone` 포함, `cost_price` 미포함)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; 쿼리 실패 시 `fetchAllRows`에서 `Error(error?.message ?? 'query failed')` throw (`paginate-all.ts:19`)

#### getPublicFuelSurcharges()
- **Path**: `src/app/actions/ups/rates-public.ts:48-56`
- **설명**: 원가율(`cost_rate`) 컬럼을 제외하고 UPS 유류할증료 판매 요율 이력(`zen_ups_fuel_surcharges`, `selling_rate` 및 `product` 조인)을 `effective_week` 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates-public.ts:49`, 로그인 세션 검증 — DB RLS `ups_fuel_surcharges_authenticated_select` 적용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<PublicFuelSurcharge[]>` (`rates-public.ts:40-46`, `data ?? []`, `cost_rate` 미포함)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates-public.ts:54`)

#### getPublicOtherCharges()
- **Path**: `src/app/actions/ups/rates-public.ts:68-77`
- **설명**: 원가(`cost_price`) 컬럼을 제외하고 활성 상태(`is_active = true`)인 UPS 부가요금 판매가 목록(`zen_ups_other_charges`, `selling_price`·`unit`·`fuel_surcharge_applicable`·`currency`)을 `charge_code` 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates-public.ts:69`, 로그인 세션 검증 — DB RLS `ups_other_charges_authenticated_select` 적용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<PublicOtherCharge[]>` (`rates-public.ts:58-66`, `data ?? []`, `cost_price` 미포함)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates-public.ts:75`)

#### getPublicWeightTierRates()
- **Path**: `src/app/actions/ups/rates-public.ts:93-102`
- **설명**: 원가(`price_per_kg_cost`) 컬럼을 제외하고 활성 상태(`is_active = true`)인 20kg 초과 중량 구간별 kg당 판매 단가 목록(`zen_ups_weight_tier_rates`, `price_per_kg_selling` 및 `product`·`zone` 조인)을 `tier_min_kg` 오름차순으로 조회합니다. 기준일(`valid_from <= refDate`, `valid_until is null or >= refDate`) 필터를 적용합니다(TASK-B-373 PR-2).
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates-public.ts:94`, 로그인 세션 검증 — DB RLS 적용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<PublicWeightTierRate[]>` (`rates-public.ts:79-91`, `data ?? []`, `price_per_kg_cost` 미포함)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates-public.ts:100`)

#### getPublicFreightMinimums()
- **Path**: `src/app/actions/ups/rates-public.ts:114-122`
- **설명**: 원가(`min_charge_cost`) 컬럼을 제외하고 활성 상태(`is_active = true`)인 Freight 상품 최소 청구 판매 운임 목록(`zen_ups_freight_minimums`, `min_charge_selling` 및 `product`·`zone` 조인)을 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates-public.ts:115`, 로그인 세션 검증 — DB RLS 적용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<PublicFreightMinimum[]>` (`rates-public.ts:104-112`, `data ?? []`, `min_charge_cost` 미포함)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates-public.ts:120`)

#### getPublicSurgeFees()
- **Path**: `src/app/actions/ups/rates-public.ts:134-146`
- **설명**: 원가(`cost_rate_per_kg`) 컬럼을 제외하고 오늘(`refDate`) 기준 유효 구간(`effective_from <= refDate` 및 `effective_until IS NULL OR >= refDate`)이며 활성 상태(`is_active = true`)인 도착국별 UPS 급증 긴급 수수료 판매 단가 목록(`zen_ups_surge_fees`, `selling_rate_per_kg`)을 `destination_country_code` 오름차순으로 조회합니다 (Issue #491).
- **권한**: `validateUserAction()` (`src/app/actions/ups/rates-public.ts:135`, 로그인 세션 검증 — DB RLS `ups_surge_fees_authenticated_select` 적용)
- **Input**: 없음 (`()`)
- **Output**: `Promise<PublicSurgeFee[]>` (`rates-public.ts:125-132`, `data ?? []`, `cost_rate_per_kg` 미포함)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 조회 실패 시 `Error(error.message)` throw (`rates-public.ts:144`)

### 11.18 UPS 할인율·부피계수 적용 예약 및 감사 로그 Actions (`src/app/actions/ups/pricing-schedule.ts` — TASK-1165 / Issue #1378)

#### createPricingSchedule(input)
- **Path**: `src/app/actions/ups/pricing-schedule.ts:135-186`
- **설명**: UPS 대리점 할인율(`AGENCY_DISCOUNT`), 화주 할인율(`SHIPPER_DISCOUNT`), 대리점 부피중량 제수(`VOLUMETRIC_DIVISOR`) 변경 예약을 `zen_ups_pricing_schedule`(`status: 'SCHEDULED'`)에 등록하고 감사 로그(`CREATE`)를 남깁니다. `valid_from`이 오늘(KST) 이하이면 익일 자정 cron을 기다리지 않고 `applySchedule()`로 즉시 반영(`status = 'APPLIED'`)합니다 (TASK-B-263 / Issue #1021).
- **권한**: `validateUserAction()` + `requireSchedulePermission(profile?.role, input.setting_type, input.target_ref, profile?.org_id)` (`pricing-schedule.ts:35-48, 136-137` — `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용; `AGENCY`는 `SHIPPER_DISCOUNT`이면서 `target_ref.agency_org_id === profile.org_id`인 경우만 허용. 단, `AGENCY` 호출 시 `new_value` 역마진·범위 검증 및 `shipper_org_id` 소속 확인 부재는 `DEF-152` 참조) + `createAdminClient()`(L141)
- **Input**: `input: { setting_type: 'AGENCY_DISCOUNT' | 'SHIPPER_DISCOUNT' | 'VOLUMETRIC_DIVISOR'; target_ref: Record<string, string>; new_value: number; valid_from: string; valid_until?: string | null }` (`pricing-schedule.ts:11-19`)
- **Output**: `Promise<Record<string, unknown>>` (생성된 `zen_ups_pricing_schedule` 행 — 당일 즉시 적용 시 `status: 'APPLIED'`, 미래 일자 시 `'SCHEDULED'`)
- **오류**: 권한 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` / `Error("본인 소속 대리점의 할인율만 관리할 수 있습니다.")` throw(`L41-47`); 과거 일자(`< getKstToday()`) 또는 `valid_until <= valid_from` 시 `validateScheduleDates` throw(`L56-64`); 기간 중복 시 `checkOverlap`에서 `Error("기간이 겹치는 예약이 이미 존재합니다 ...")` throw(`L102`); DB insert/적용 실패 시 `Error(error.message)` throw
- **부수효과**: `zen_ups_pricing_schedule` INSERT(`L161-165`), `zen_ups_pricing_setting_audit_log`(`action: 'CREATE'`) INSERT(`L169-175`), 당일(`<= getKstToday()`)이면 `applySchedule()` 실행(`zen_agency_pricing_policies`/`zen_agency_shipper_zone_discounts`/`zen_organizations` 갱신 + `status='APPLIED'` + `APPLY` 감사 로그, `L179-182`), `revalidatePath('/admin/ups-rates')`(`L184`)

#### updatePricingSchedule(id, input)
- **Path**: `src/app/actions/ups/pricing-schedule.ts:190-258`
- **설명**: `SCHEDULED` 상태인 예약(`zen_ups_pricing_schedule.id`)의 `new_value`, `valid_from`, `valid_until`을 수정하고 `UPDATE` 감사 로그를 기록합니다. 수정 후 `valid_from`이 오늘(KST) 이하이면 즉시 `applySchedule()`로 반영합니다 (TASK-B-263).
- **권한**: `validateUserAction()` + `createAdminClient()` 조회 후 `requireSchedulePermission(profile?.role, existing.setting_type, existing.target_ref, profile?.org_id)` (`pricing-schedule.ts:191-204`)
- **Input**: `id: string` (`zen_ups_pricing_schedule.id`), `input: { new_value?: number; valid_from?: string; valid_until?: string | null }` (`L21-25`)
- **Output**: `Promise<void>`
- **오류**: 미존재 시 `Error("해당 예약을 찾을 수 없습니다.")` throw(`L201`); `status !== 'SCHEDULED'` 시 `Error("SCHEDULED 상태인 예약만 수정 가능합니다.")` throw(`L202`); 권한·날짜·기간 중복·DB 오류 시 각각 `Error` throw
- **부수효과**: `zen_ups_pricing_schedule` UPDATE(`L230-233`), `zen_ups_pricing_setting_audit_log`(`action: 'UPDATE'`) INSERT(`L237-244`), 당일이면 `applySchedule()` 실행(`L248-255`), `revalidatePath('/admin/ups-rates')`(`L257`)

#### cancelPricingSchedule(id)
- **Path**: `src/app/actions/ups/pricing-schedule.ts:262-294`
- **설명**: `SCHEDULED` 상태인 예약(`zen_ups_pricing_schedule.id`)의 상태를 `CANCELLED`로 변경하고 `CANCEL` 감사 로그를 기록합니다.
- **권한**: `validateUserAction()` + `createAdminClient()` 조회 후 `requireSchedulePermission(profile?.role, existing.setting_type, existing.target_ref, profile?.org_id)` (`pricing-schedule.ts:263-276`)
- **Input**: `id: string` (`zen_ups_pricing_schedule.id`)
- **Output**: `Promise<void>`
- **오류**: 미존재 시 `Error("해당 예약을 찾을 수 없습니다.")` throw(`L273`); `status !== 'SCHEDULED'` 시 `Error("SCHEDULED 상태인 예약만 취소 가능합니다.")` throw(`L274`); 권한·DB 실패 시 `Error` throw
- **부수효과**: `zen_ups_pricing_schedule.status = 'CANCELLED'` UPDATE(`L278-281`), `zen_ups_pricing_setting_audit_log`(`action: 'CANCEL'`) INSERT(`L285-291`), `revalidatePath('/admin/ups-rates')`(`L293`)

#### getScheduledPricingChanges(settingType?)
- **Path**: `src/app/actions/ups/pricing-schedule.ts:298-323`
- **설명**: 요율·부피계수 예약 목록(`zen_ups_pricing_schedule`)을 `valid_from` 오름차순으로 조회합니다 (`AGENCY` 호출 시 본인 `agency_org_id`로 자동 필터링).
- **권한**: `validateUserAction()` + 역할 검증(`ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 또는 `AGENCY && settingType === 'SHIPPER_DISCOUNT'`, `L299-305`, `AGENCY`는 `target_ref->>agency_org_id = profile.org_id` 강제 필터, `L316-318`)
- **Input**: `settingType?: 'AGENCY_DISCOUNT' | 'SHIPPER_DISCOUNT' | 'VOLUMETRIC_DIVISOR'` (선택)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`data || []`)
- **오류**: 권한 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw(`L304`); DB 조회 실패 시 `Error(error.message)` throw(`L321`)

#### getPricingAuditLog(settingType?, targetRef?)
- **Path**: `src/app/actions/ups/pricing-schedule.ts:325-357`
- **설명**: 요율·부피계수 설정 변경 감사 로그(`zen_ups_pricing_setting_audit_log`)를 `changed_at` 내림차순 최대 100건 조회합니다.
- **권한**: `validateUserAction()` + 역할 검증(`ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 또는 `AGENCY && settingType === 'SHIPPER_DISCOUNT'`, `L326-332`, `AGENCY`는 `target_ref->>agency_org_id = profile.org_id` 강제 필터, `L350-352`)
- **Input**: `settingType?: SettingType`, `targetRef?: Record<string, string>` (선택)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`data || []`, 최대 100건)
- **오류**: 권한 불충족 시 `Error("UPS 요율 관리 권한이 없습니다.")` throw(`L331`); DB 조회 실패 시 `Error(error.message)` throw(`L355`)
