# DEF-151 | `ups/{rates,rates-mutation,rates-public}.ts` 원가 포함 조회 액션 역할 가드 공백, `/agency/other-charges` RSC 원가 노출 및 `getAgencyPricingPolicies` 가드 누락

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1164 (Issue #1360, R-12 Ds-11 미반영 3차 `ups/rates`·`rates-mutation`·`rates-public` 21개 함수 문서화) 수행 중, 21개 함수의 권한 가드·입력·출력·호출처·DB RLS를 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **High** (1번 항목: `rates.ts` 원가 포함 조회 Server Action 6종의 역할 가드 부재 및 `/agency/other-charges` RSC payload에 `cost_price` 노출) / **Low** (2~3번 항목: `getAgencyPricingPolicies` 액션 레벨 역할·소유권 가드 부재, `getPublicWeightTierRates` 유효기간 필터 미적용) |
| **발견일** | 2026-11-17 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1360 (TASK-1164) · Issue #1338 (TASK-1156, DEF-147 점검 병행) · TASK-B-091 (`1187335f`) · R-12 · R-18 |
| **조치 상태** | 미해소 (핵심 6종 미해소; `TASK-B-373` PR-1 `#1479`만 `develop` 반영, PR-2 진행 중) |

> **공개 저장소 기준 (R-18 / IS #1489)**: 원가 포함 함수·컬럼·RSC 노출 경로 상세는 비공개 경로로 관리합니다. 본 문서에는 목표 상태 및 조치 범위만 기록합니다.

---

## 1. 목표 상태 (정비 대상)

1. 비관리자(대리점·화주) 요율/부가요금 화면은 공개 조회 모듈(`rates-public.ts`)만 사용하여 원가 정보를 포함하지 않습니다.
2. `src/app/actions/ups/rates.ts` 내 관리자 전용 원가 조회 액션은 관리자 역할 가드(`ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN`·허용 범위 내 `SUB_ADMIN`)를 강제합니다.
3. `rates-mutation.ts` 및 `rates-public.ts`의 역할·소유권·유효기간 필터를 정합화합니다.

---

## 2. 권장 조치 방안 (후속 수정 Task 인계용)

1. **`src/app/[locale]/(dashboard)/agency/other-charges/page.tsx` 및 `agency-other-charges-client.tsx`**:
   - `getUpsOtherCharges()` 호출을 `getPublicOtherCharges()`(`@/app/actions/ups/rates-public`)로 교체하여 `/agency/other-charges` RSC payload에서 `cost_price`를 제거.
2. **`src/app/actions/ups/rates.ts`**:
   - 원가 포함 조회 6종(`getUpsBaseRates`, `getUpsFuelSurcharge`, `getUpsOtherCharges`, `getUpsSurgeFees`, `getUpsWeightTierRates`, `getUpsFreightMinimums`) 상단에 `ADMIN` / `MANAGER` / `ZENITH_SUPER_ADMIN` / `SUB_ADMIN` 역할 가드를 추가하여 비관리자 직접 호출 차단 (`getUpsZones`, `getUpsProducts`는 원가 필드가 없고 오더/화주 화면에서 공용으로 사용되므로 현행 유지).
3. **`src/app/actions/ups/rates-mutation.ts` (`getAgencyPricingPolicies`) & `src/app/actions/ups/rates-public.ts` (`getPublicWeightTierRates`)**:
   - `getAgencyPricingPolicies`: `ADMIN`/`MANAGER`/`ZENITH_SUPER_ADMIN`/`SUB_ADMIN` 또는 `profile.role === 'AGENCY' && (!agencyOrgId || agencyOrgId === profile.org_id)` 가드 추가.
   - `getPublicWeightTierRates`: `refDate` 기준 `.lte('valid_from', refDate).or('valid_until.is.null,valid_until.gte.${refDate}')` 필터 추가.
