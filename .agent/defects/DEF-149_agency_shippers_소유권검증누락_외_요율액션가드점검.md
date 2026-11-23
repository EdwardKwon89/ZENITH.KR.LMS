# DEF-149 | `agency/shippers.ts` 서비스롤(`createAdminClient`) 조회·수정 시 대리점 소속(`agency_org_id`) 소유권 검증 누락 외 요율 액션 인가 공백

| 항목 | 내용 |
|:-----|:------|
| **발견 경위** | TASK-1159 (Issue #1345, R-12 Ds-11 미반영 1차 20개 함수 문서화) 수행 중, `src/app/actions/agency/*` 및 `src/app/actions/admin/{customs-rates,delivery-rates,surcharges}.ts` 20개 함수의 권한 가드를 코드 라인 단위로 전수 실사하다 발견 |
| **긴급도** | **High** (1번 항목: 타 대리점 소속 화주 조회·생성·수정 가능한 교차 테넌트 IDOR) / **Medium** (2·3번 항목: 요율 수정 시 `org_id` 변경값 미검증 및 조회 액션 역할 가드 부재) |
| **발견일** | 2026-11-17 |
| **발견자** | Riley (Team A, CPO) |
| **관련** | Issue #1345 (TASK-1159) · Issue #1338 (TASK-1156, DEF-147 점검 병행) · R-12 · R-18 |
| **조치 상태** | 미조치 — TASK-1159는 문서 전용 Task(`src/` 수정 금지)이므로 R-18에 따라 DEF 분리 등록 후 Aiden 선보고 |

---

## 1. 현상 및 코드 근거 (확인된 사실)

### 1.1 [High] `src/app/actions/agency/shippers.ts` 5개 함수 전량 — `createAdminClient()` 사용 시 `profile.org_id` 소유권 대조 누락 (교차 대리점 IDOR)

`src/app/actions/agency/shippers.ts`의 export 액션 5개는 모두 진입 시 `validateUserAction()`과 `checkPermission(profile.role, '/agency')`(`AGENCY` 또는 `ZENITH_SUPER_ADMIN` 역할 허용)만 검사한 뒤, 곧바로 **`createAdminClient()`(`service_role`, RLS 전면 우회)** 클라이언트를 생성해 쿼리를 실행한다. 그러나 클라이언트 인자로 전달된 `agencyOrgId` 또는 `shipperId`(`zen_agency_shippers.id`)가 **호출자 본인의 대리점(`profile.org_id`) 소속인지 확인하는 조건문이 5개 함수 모두에 없다.**

| 함수 | 소스 위치 | 가드 현황 | RLS 우회 여부 | 누락된 소유권 검증 |
|:-----|:---------|:---------|:------------:|:-----------------|
| `getAgencyShippers(agencyOrgId)` | `src/app/actions/agency/shippers.ts:118-157` | `validateUserAction()` + `checkPermission(profile.role, '/agency')` (L119-122) | `createAdminClient()` (L124) | `agencyOrgId === profile.org_id` 미검증 → 타 대리점의 화주 목록·사업자번호·연락처 조회 가능 |
| `createAgencyShipper(agencyOrgId, shipperData)` | `src/app/actions/agency/shippers.ts:163-273` | `validateUserAction()` + `checkPermission(profile.role, '/agency')` (L167-170) | `createAdminClient()` (L182) | `agencyOrgId === profile.org_id` 미검증 → 타 대리점 명의로 화주 생성·연결 가능 |
| `updateAgencyShipperGrade(id, grade, discountRate)` | `src/app/actions/agency/shippers.ts:275-308` | `validateUserAction()` + `checkPermission(profile.role, '/agency')` (L280-283) | `createAdminClient()` (L290) | 대상 행(`zen_agency_shippers.id`)의 `agency_org_id === profile.org_id` 미검증 + 역마진 가드 미적용 |
| `getAgencyShipperById(shipperId)` | `src/app/actions/agency/shippers.ts:310-350` | `validateUserAction()` + `checkPermission(profile.role, '/agency')` (L311-314) | `createAdminClient()` (L316) | 대상 행의 `agency_org_id === profile.org_id` 미검증 → 타 대리점 화주 상세 주소·담당자 열람 가능 |
| `updateAgencyShipper(shipperId, data)` | `src/app/actions/agency/shippers.ts:356-427` | `validateUserAction()` + `checkPermission(profile.role, '/agency')` (L360-363) | `createAdminClient()` (L375) | L381-386에서 `select('shipper_org_id')`만 조회하고 `agency_org_id === profile.org_id` 미검증 → 타 대리점 화주 조직 정보·할인율·활성 여부 변조 가능 |

- **대조 근거 (`zone-discounts.ts`는 정상 구현됨)**: 같은 폴더의 `src/app/actions/agency/zone-discounts.ts:49-61` (`upsertShipperZoneDiscounts`)은 동일하게 `createAdminClient()`를 쓰지만, L59-61에서 명시적으로 `if (agencyOrgId !== profile.org_id) { return { success: false, fieldErrors: { _form: '본인 소속 화주가 아닙니다.' } }; }`를 검증하고 있다.

---

### 1.2 [Medium] `updateCustomsRate` · `updateDeliveryRate` — 파트너 역할이 수정 페이로드에 타 조직 `org_id` 주입 가능

- `src/app/actions/admin/customs-rates.ts:78-91` (`updateCustomsRate`):
  - L78-88에서 `profile.role === USER_ROLES.CUSTOMS_BROKER`일 때 기존 행의 `existing.org_id !== profile.org_id`는 검사한다.
  - 그러나 직후 L91에서 `if (data.org_id !== undefined) updateData.org_id = data.org_id;`를 그대로 허용하여, `CUSTOMS_BROKER`가 본인 요율 행을 수정하면서 `data.org_id`에 타 조직 UUID를 넣어 요율 소유 조직을 이전시킬 수 있다.
- `src/app/actions/admin/delivery-rates.ts:98-111` (`updateDeliveryRate`):
  - 동일하게 L98-108에서 기존 행 `existing.org_id !== profile.org_id`만 검사하고, L111에서 `if (data.org_id !== undefined) updateData.org_id = data.org_id;`를 허용한다.
  - 또한 `createDeliveryRate`(L61)에서 호출하는 `validateServiceType(data)`(`LOCAL` 시 `country_code` 필수, `TOTAL` 시 `transport_mode`·`origin_code`·`dest_code` 필수)가 `updateDeliveryRate`에서는 호출되지 않는다.

---

### 1.3 [Medium] 조회 액션 4건(`getAgencyOrgIdByShipper`, `getCustomsRates`, `getDeliveryRates`, `getSurcharges`) — 액션 레벨 역할 가드 부재 (Task #1338 연계)

- `src/app/actions/agency/shipper-link.ts:6-17` (`getAgencyOrgIdByShipper`): `validateUserAction()`만 호출하며 역할 검사나 `shipperOrgId === profile.org_id` 검사가 없다(일반 세션 클라이언트를 사용하므로 `zen_agency_shippers` RLS 정책에만 의존).
- `src/app/actions/admin/customs-rates.ts:112-140` (`getCustomsRates`) 및 `src/app/actions/admin/delivery-rates.ts:135-167` (`getDeliveryRates`): `validateUserAction()`만 호출하며, `CORPORATE`·`INDIVIDUAL`·`CARRIER`에는 `is_active = true` 필터를 걸지만 `AGENCY`·`AGENCY_SHIPPER`·`USER` 등 기타 역할에 대해서는 비활성 요율(`is_active = false`)까지 필터 없이 반환될 수 있는 블랙리스트 방식(`if (role === CORPORATE || ...)`)으로 작성되어 있다.
- `src/app/actions/admin/surcharges.ts:88-101` (`getSurcharges`): 쓰기 함수 3종(`createSurcharge`, `updateSurcharge`, `deleteSurcharge`)은 `profile.role !== USER_ROLES.ADMIN`을 차단하지만(단, `MANAGER` 미허용 불일치 존재), `getSurcharges()`는 `validateUserAction()`만 호출하고 역할 검사 및 `is_active` 필터가 없다. (병행 진행 중인 Issue #1338 / TASK-1156 B_Kai 점검 범위와 맞물리므로 Aiden에게 함께 공유)

---

## 2. 영향 범위

- **1.1 (`agency/shippers.ts`)**: `AGENCY` 권한을 가진 임의의 대리점 계정이 Server Action 직접 호출 시 타 대리점의 화주 명단/상세 정보를 열람하거나 타 대리점 화주의 할인율·등급·활성 상태를 변경할 수 있음 (`createAdminClient()`가 RLS를 우회하므로 DB RLS로 방어되지 않음).
- **1.2 (`customs-rates.ts`, `delivery-rates.ts`)**: `CUSTOMS_BROKER` / `DELIVERY_AGENT` 계정이 요율 수정 시 `org_id` 변조 가능(단, 해당 테이블의 RLS `WITH CHECK` 정책 존재 여부에 따라 DB 단계 차단 여부는 별도 확인 필요).
- **1.3 (조회 액션 4건)**: 로그인한 일반/타 역할 사용자가 Server Action 직접 호출 시 비활성 요율 또는 타 조직 매핑 정보 조회 가능성(RLS 정책 범위에 의존).

---

## 3. 권장 조치

1. **`src/app/actions/agency/shippers.ts` (즉시/High 권장)**:
   - `ZENITH_SUPER_ADMIN`(및 필요 시 플랫폼 `ADMIN`)이 아닌 경우:
     - `getAgencyShippers`, `createAgencyShipper`: 진입부에서 `if (agencyOrgId !== profile.org_id)` 즉시 차단.
     - `getAgencyShipperById`, `updateAgencyShipper`, `updateAgencyShipperGrade`: 대상 `zen_agency_shippers` 행 조회 시 `.eq('agency_org_id', profile.org_id)` 조건을 강제하거나 조회된 `agency_org_id !== profile.org_id` 시 즉시 차단.
2. **`src/app/actions/admin/customs-rates.ts` · `delivery-rates.ts` (Medium)**:
   - `updateCustomsRate` / `updateDeliveryRate`에서 호출자가 `CUSTOMS_BROKER` / `DELIVERY_AGENT`일 때는 `updateData.org_id = profile.org_id`(또는 `data.org_id !== profile.org_id` 거부)로 고정.
   - `getCustomsRates` / `getDeliveryRates`의 `is_active = true` 필터를 블랙리스트 방식 대신 "`ADMIN`·`MANAGER`·본인 조직 파트너 외에는 모두 `is_active = true`만 조회"하는 화이트리스트 방식으로 전환.
3. **`src/app/actions/admin/surcharges.ts` (Low/Medium)**:
   - `MANAGER` 역할 허용 여부를 다른 요율 모듈(`customs-rates`, `delivery-rates`, `rates`)과 정합화하고, 비관리자 호출 시 `is_active = true` 필터 적용 검토.
