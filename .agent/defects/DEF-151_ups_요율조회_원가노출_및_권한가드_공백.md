# DEF-151 | `ups/{rates,rates-mutation,rates-public}.ts` 원가 포함 조회 액션 역할 가드 공백, `/agency/other-charges` RSC 원가 노출 및 `getAgencyPricingPolicies` 가드 누락

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1164 (Issue #1360, R-12 Ds-11 미반영 3차 `ups/rates`·`rates-mutation`·`rates-public` 21개 함수 문서화) 수행 중, 21개 함수의 권한 가드·입력·출력·호출처·DB RLS를 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **High** (1번 항목: `rates.ts` 원가 포함 조회 Server Action 6종의 역할 가드 부재 및 `/agency/other-charges` RSC payload에 `cost_price` 노출) / **Low** (2~3번 항목: `getAgencyPricingPolicies` 액션 레벨 역할·소유권 가드 부재, `getPublicWeightTierRates` 유효기간 필터 미적용) |
| **발견일** | 2026-11-17 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1360 (TASK-1164) · Issue #1338 (TASK-1156, DEF-147 점검 병행) · TASK-B-091 (`1187335f`) · R-12 · R-18 |
| **조치 상태** | 미조치 — TASK-1164는 문서 전용 Task(`src/` 수정 금지)이므로 R-18에 따라 DEF 분리 등록 후 Aiden 선보고 (소유 팀 `git log` 근거 포함) |

---

## 1. 현상 및 코드 근거 (확인된 사실)

### 1.1 [High] `src/app/actions/ups/rates.ts` — 원가(`cost_price`·`cost_rate` 등) 포함 조회 Server Action 6종의 역할 가드 부재 및 `/agency/other-charges` RSC 원가 노출

1. **`rates.ts` 원가 포함 조회 액션 6종에 역할 가드 부재**:
   - `TASK-B-091`(`1187335f [Dave] fix: TASK-B-091 원가 데이터 RSC payload 노출 제거 — rates-public.ts 전용 조회 함수로 cost_price 컬럼 미포함`)에서 비관리자(Agency·Shipper) 요율표 화면의 원가 노출을 막기 위해 `src/app/actions/ups/rates-public.ts`를 분리 신설했다.
   - 그러나 원본 `src/app/actions/ups/rates.ts`는 여전히 `'use server'` 모듈로 export되어 있으며, 원가 컬럼을 포함한 전체 컬럼(`select('*')`)을 반환하는 아래 **6개 Server Action** 모두 `validateUserAction()`(로그인 여부)만 호출하고 **관리자 역할 가드(`requireAdminOrManager` 또는 `requireAdminManagerOrSubAdmin`)를 수행하지 않는다**:
     - `getUpsBaseRates` (`rates.ts:41-67`): `zen_ups_base_rates.cost_price` 포함 반환 (또한 `'use client'` 컴포넌트인 `src/components/ups/UpsBaseRateMatrix.tsx:7, 89`에서 직접 import하여 클라이언트 번들에 Server Action ID가 노출됨)
     - `getUpsFuelSurcharge` (`rates.ts:69-85`): `zen_ups_fuel_surcharges.cost_rate` 포함 반환
     - `getUpsOtherCharges` (`rates.ts:87-96`): `zen_ups_other_charges.cost_price` 포함 반환
     - `getUpsSurgeFees` (`rates.ts:99-108`): `zen_ups_surge_fees.cost_rate_per_kg` 및 과거 비활성 이력(`is_active` 필터 없음) 포함 반환
     - `getUpsWeightTierRates` (`rates.ts:110-119`): `zen_ups_weight_tier_rates.price_per_kg_cost` 포함 반환
     - `getUpsFreightMinimums` (`rates.ts:121-129`): `zen_ups_freight_minimums.min_charge_cost` 포함 반환
   - DB RLS 정책(`ups_base_rates_agency_select`·`shipper_select`, `ups_fuel_surcharges_authenticated_select`, `ups_other_charges_authenticated_select`, `ups_surge_fees_authenticated_select`, `ups_weight_tier_rates_agency_select`·`shipper_select`, `ups_freight_minimums_agency_select`·`shipper_select`)은 행(row) 단위 `SELECT`를 `AGENCY`·`CORPORATE`·`INDIVIDUAL`(또는 `authenticated` 전체)에 허용하고 있으므로, 비관리자 세션이 위 Server Action을 호출하면 플랫폼 원가 전수가 그대로 반환된다.
2. **`/agency/other-charges` 페이지의 RSC payload 원가 노출 잔존**:
   - `src/app/[locale]/(dashboard)/agency/other-charges/page.tsx:5, 14, 25`에서 `getPublicOtherCharges()` 대신 **`getUpsOtherCharges()`(`rates.ts:87`)를 호출**하여 `allOtherCharges`(`cost_price` 포함)를 클라이언트 컴포넌트 `<AgencyOtherChargesClient allOtherCharges={allOtherCharges} />`의 prop으로 전달하고 있다 (`TASK-B-091` 수정 당시 `/agency/ups-rates`와 `/shipper/ups-rates`만 `rates-public.ts`로 교체되고 `/agency/other-charges`는 누락됨).
3. **소유 팀 근거 (`git log`)**:
   - `src/app/actions/ups/rates.ts`: 최초 작성 **Team A `[D_Kai]`** (`fee7bf14`, TASK-143), 기능 확장 **Team A `[Gemini]`** (`f4031caf`, GH#204) · **`[Claude]`** (`035b9b94`, TASK-184), 공개 조회 분리 및 페이지네이션 수정 **Team B `[Dave]`** (`1187335f` TASK-B-091, `e40535de` TASK-B-268, `1289c031` TASK-B-270) · **`[Baker]`** (`36574ad4` TASK-B-055).
   - `src/app/[locale]/(dashboard)/agency/other-charges/page.tsx`: 최초 작성 **Team A `[Gemini]`** (`f4031caf`, GH#204).

---

### 1.2 [Low] `src/app/actions/ups/rates-mutation.ts:255-265` — `getAgencyPricingPolicies(agencyOrgId?: string)` 액션 레벨 역할·소유권 검증 부재

1. **현상 및 코드 근거**:
   - `src/app/actions/ups/rates-mutation.ts` 내 21개 함수 중 20개 쓰기 함수는 모두 `requireAdminOrManager(profile?.role)`(L9-13) 또는 `requireAdminManagerOrSubAdmin(profile?.role)`(L17-21)을 수행한다.
   - 그러나 유일한 조회 함수인 `getAgencyPricingPolicies(agencyOrgId?: string)`(L255-265)는 `const { supabase } = await validateUserAction();`만 호출하고 역할 가드 및 `AGENCY` 호출 시 `agencyOrgId === profile.org_id` 소유권 검증을 수행하지 않는다.
   - 현재는 일반 세션 클라이언트(`supabase`)를 사용하여 DB RLS(`agency_pricing_policies_admin_all`, `agency_pricing_policies_sub_admin_scoped`, `agency_pricing_policies_agency_select`)가 타 대리점 행을 차단하므로 즉각적인 데이터 유출은 없으나, 단일 방어선(RLS)에만 의존하고 있어 화주(`CORPORATE`/`INDIVIDUAL`/`AGENCY_SHIPPER`)나 타 대리점이 호출해도 권한 예외 없이 빈 배열(`[]`)을 반환한다.
2. **소유 팀 근거 (`git log`)**:
   - `src/app/actions/ups/rates-mutation.ts`: **Team A `[D_Kai]`** (`ce0a3ade` TASK-192, `f0b4629e` IMP-151) · **`[Claude]`** (`fe4edd65` Issue #605, `035b9b94` TASK-184), **Team B `[Dave]`** (`d69d243c` Issue #381, `838f2e1b` TASK-B-089).

---

### 1.3 [Low] `src/app/actions/ups/rates-public.ts:93-102` — `getPublicWeightTierRates()`의 유효기간(`valid_from` / `valid_until`) 필터 미적용

1. **현상 및 코드 근거**:
   - `src/app/actions/ups/rates-public.ts`의 `getPublicBaseRates()`(L29-30)와 `getPublicSurgeFees()`(L141-142)는 오늘(`refDate`) 기준 `.lte('valid_from', refDate).or('valid_until.is.null,valid_until.gte.${refDate}')` 필터를 적용해 현재 유효한 요율만 반환한다.
   - 반면 같은 공개 조회 파일의 `getPublicWeightTierRates()`(L93-102)는 `.eq('is_active', true)`만 적용하고 `valid_from`/`valid_until` 필터를 누락하여, 만료되었거나 미래 적용 예정인 중량 구간 요율 행이 활성 상태로 존재할 경우 공개 요율표에 함께 노출될 수 있다.
2. **소유 팀 근거 (`git log`)**:
   - `src/app/actions/ups/rates-public.ts`: **Team B `[Dave]`** (`1187335f` TASK-B-091, `e40535de` TASK-B-268, `1289c031` TASK-B-270) · **`[Mike]`** (`493b1786` DEF-B-040), **Team A `[Claude]`** (`cca7de5c` TASK-184 후속).

---

## 2. 권장 조치 방안 (후속 수정 Task 인계용)

1. **`src/app/[locale]/(dashboard)/agency/other-charges/page.tsx` 및 `agency-other-charges-client.tsx`**:
   - `getUpsOtherCharges()` 호출을 `getPublicOtherCharges()`(`@/app/actions/ups/rates-public`)로 교체하여 `/agency/other-charges` RSC payload에서 `cost_price`를 제거.
2. **`src/app/actions/ups/rates.ts`**:
   - 원가 포함 조회 6종(`getUpsBaseRates`, `getUpsFuelSurcharge`, `getUpsOtherCharges`, `getUpsSurgeFees`, `getUpsWeightTierRates`, `getUpsFreightMinimums`) 상단에 `ADMIN` / `MANAGER` / `ZENITH_SUPER_ADMIN` / `SUB_ADMIN` 역할 가드를 추가하여 비관리자 직접 호출 차단 (`getUpsZones`, `getUpsProducts`는 원가 필드가 없고 오더/화주 화면에서 공용으로 사용되므로 현행 유지).
3. **`src/app/actions/ups/rates-mutation.ts` (`getAgencyPricingPolicies`) & `src/app/actions/ups/rates-public.ts` (`getPublicWeightTierRates`)**:
   - `getAgencyPricingPolicies`: `ADMIN`/`MANAGER`/`ZENITH_SUPER_ADMIN`/`SUB_ADMIN` 또는 `profile.role === 'AGENCY' && (!agencyOrgId || agencyOrgId === profile.org_id)` 가드 추가.
   - `getPublicWeightTierRates`: `refDate` 기준 `.lte('valid_from', refDate).or('valid_until.is.null,valid_until.gte.${refDate}')` 필터 추가.
