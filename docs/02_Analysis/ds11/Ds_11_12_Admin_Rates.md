## 12. 관리자 통관·배송·부가할증 요율 관리 (Admin Rate Management — TASK-1159 / Issue #1345)

> **문서화 제외 모듈 안내**: `src/app/actions/admin/rate-cards.ts`(모듈 전체 `@deprecated` 선언) 및 `src/app/actions/admin/rates.ts`는 요율 카드 CRUD 4개 함수명이 두 파일에 중복 존재하여 별도 정리 대상이므로 1차 배치(Issue #1345) 문서화 대상에서 제외합니다(`check-ds11-sync.mjs` 래칫 기준선 `206 → 186` 유지를 위해 제외 함수 영문 식별자는 본문에 표기하지 않음).

### 12.1 통관 서비스 요율 관리 (`src/app/actions/admin/customs-rates.ts`)

#### createCustomsRate(data)
- **Path**: `src/app/actions/admin/customs-rates.ts:33-69` (`withAction` 래핑)
- **설명**: 통관 서비스 요율(`zen_customs_rates`)을 신규 등록합니다 (`country_code` 대문자 정규화, `is_active: true`, `created_by: profile.id`).
- **권한**: `validateUserAction()` + 인라인 `canWriteCustomsRates(profile.role)` (`ADMIN`, `MANAGER`, `CUSTOMS_BROKER` 허용, `customs-rates.ts:29-38`) + `CUSTOMS_BROKER`인 경우 `data.org_id === profile.org_id` 본인 조직 검증 (`customs-rates.ts:40-45`)
- **Input**: `data: CreateCustomsRateData` (`{ org_id: string, country_code: string, currency?: string, cost_per_kg?: number | null, cost_per_cbm?: number | null, fixed_fee?: number | null, transit_days?: number | null, valid_from: string, valid_until?: string | null }`, `customs-rates.ts:9-19`)
- **Output**: `Promise<ActionResult<CustomsRate>>` (`withAction` 표준 응답: `{ data: CustomsRate, error: null } | { data: null, error: string }`)
- **오류**: 미인증(`"Login required"` / `"Profile not found"`), 역할 불충족(`"통관 서비스 요율 등록 권한이 없습니다."`, `customs-rates.ts:37`), 타 조직 등록 시도(`"본인 조직의 요율만 등록할 수 있습니다."`, `customs-rates.ts:43`), DB insert 실패(`"통관 요율 등록 실패: ${error.message}"`, `customs-rates.ts:65`) 시 throw 후 `withAction`이 포착해 `logger.error('[Action Error]', err)` 기록 및 `{ data: null, error }` 반환
- **부수효과**: `revalidatePath('/admin/customs-rates')` (`customs-rates.ts:67`)

#### updateCustomsRate(id, data)
- **Path**: `src/app/actions/admin/customs-rates.ts:71-110` (`withAction` 래핑)
- **설명**: 기존 통관 서비스 요율(`zen_customs_rates.id`)을 부분 수정합니다.
- **권한**: `validateUserAction()` + 인라인 `canWriteCustomsRates(profile.role)` (`ADMIN`, `MANAGER`, `CUSTOMS_BROKER`, `customs-rates.ts:72-76`) + `CUSTOMS_BROKER`인 경우 기존 행 `existing.org_id === profile.org_id` 검증 (`customs-rates.ts:78-88` — 단, `data.org_id` 변경값 재검증 누락은 `DEF-149` 참조)
- **Input**: `id: string` (`zen_customs_rates.id`), `data: Partial<CreateCustomsRateData>`
- **Output**: `Promise<ActionResult<boolean>>` (`{ data: true, error: null } | { data: null, error: string }`)
- **오류**: 역할 불충족(`"통관 서비스 요율 수정 권한이 없습니다."`, `customs-rates.ts:75`), 타 조직 요율 수정 시도(`"본인 조직의 요율만 수정할 수 있습니다."`, `customs-rates.ts:86`), DB 업데이트 실패(`"통관 요율 수정 실패: ${error.message}"`, `customs-rates.ts:106`) 시 `withAction` 경유 `{ data: null, error }` 반환
- **부수효과**: `revalidatePath('/admin/customs-rates')` (`customs-rates.ts:108`)

#### getCustomsRates(orgId?)
- **Path**: `src/app/actions/admin/customs-rates.ts:112-140` (`withAction` 미래핑)
- **설명**: 통관 서비스 요율 목록(`zen_customs_rates` + `zen_organizations!inner(name)` 조인)을 생성일 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` (`customs-rates.ts:113`, 별도 역할 차단 없음 — `CUSTOMS_BROKER`는 본인 `profile.org_id`로 강제 필터링(`L124-126`), `CORPORATE`·`INDIVIDUAL`·`CARRIER`는 `is_active = true` 필터링(`L128-130`), `DEF-149` 참조)
- **Input**: `orgId?: string` (선택적 조직 ID 필터)
- **Output**: `Promise<CustomsRate[]>` (`zen_organizations(name)` 포함 배열, `customs-rates.ts:139`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 기록 후 `Error("통관 요율 조회 실패: ${error.message}")` 직접 throw (`customs-rates.ts:134-137`)

#### deleteCustomsRate(id)
- **Path**: `src/app/actions/admin/customs-rates.ts:142-170` (`withAction` 래핑)
- **설명**: 통관 서비스 요율(`zen_customs_rates.id`)을 비활성화(`is_active = false`, Soft Delete)합니다.
- **권한**: `validateUserAction()` + 인라인 역할 비교 (`ADMIN`, `MANAGER`, `CUSTOMS_BROKER`만 허용, `customs-rates.ts:143-147`) + `CUSTOMS_BROKER`인 경우 `existing.org_id === profile.org_id` 본인 조직 검증 (`customs-rates.ts:149-159`)
- **Input**: `id: string` (`zen_customs_rates.id`)
- **Output**: `Promise<ActionResult<boolean>>` (`{ data: true, error: null } | { data: null, error: string }`)
- **오류**: 역할 불충족(`"통관 서비스 요율 삭제 권한이 없습니다."`, `customs-rates.ts:146`), 타 조직 삭제 시도(`"본인 조직의 요율만 삭제할 수 있습니다."`, `customs-rates.ts:157`), DB 업데이트 실패(`"통관 요율 삭제 실패: ${error.message}"`, `customs-rates.ts:166`) 시 `withAction` 경유 `{ data: null, error }` 반환
- **부수효과**: `revalidatePath('/admin/customs-rates')` (`customs-rates.ts:168`)

### 12.2 배송 서비스 요율 관리 (`src/app/actions/admin/delivery-rates.ts`)

#### createDeliveryRate(data)
- **Path**: `src/app/actions/admin/delivery-rates.ts:48-89` (`withAction` 래핑)
- **설명**: 배송 서비스 요율(`zen_delivery_rates`, `LOCAL` 또는 `TOTAL` 유형)을 신규 등록합니다.
- **권한**: `validateUserAction()` + 인라인 `canWriteDeliveryRates(profile.role)` (`ADMIN`, `MANAGER`, `DELIVERY_AGENT` 허용, `delivery-rates.ts:32-34, 49-53`) + `DELIVERY_AGENT`인 경우 `data.org_id === profile.org_id` 본인 조직 검증 (`delivery-rates.ts:55-59`)
- **Input**: `data: CreateDeliveryRateData` (`{ org_id: string, service_type: 'LOCAL' | 'TOTAL', country_code?: string | null, transport_mode?: string | null, origin_code?: string | null, dest_code?: string | null, currency?: string, cost_per_kg?: number | null, cost_per_cbm?: number | null, transit_days?: number | null, valid_from: string, valid_until?: string | null }`, `delivery-rates.ts:9-22`)
- **Output**: `Promise<ActionResult<DeliveryRate>>` (`{ data: DeliveryRate, error: null } | { data: null, error: string }`)
- **오류**: 역할 불충족(`"배송 서비스 요율 등록 권한이 없습니다."`, `delivery-rates.ts:52`), 타 조직 등록 시도(`"본인 조직의 요율만 등록할 수 있습니다."`, `delivery-rates.ts:57`), `validateServiceType` 검증 실패(`LOCAL` 시 `country_code` 필수, `TOTAL` 시 `transport_mode`·`origin_code`·`dest_code` 필수, `delivery-rates.ts:36-46, 61-62`), DB insert 실패(`"배송 요율 등록 실패: ${error.message}"`, `delivery-rates.ts:85`) 시 `withAction` 경유 `{ data: null, error }` 반환
- **부수효과**: `revalidatePath('/admin/delivery-rates')` (`delivery-rates.ts:87`)

#### updateDeliveryRate(id, data)
- **Path**: `src/app/actions/admin/delivery-rates.ts:91-133` (`withAction` 래핑)
- **설명**: 기존 배송 서비스 요율(`zen_delivery_rates.id`)을 부분 수정합니다.
- **권한**: `validateUserAction()` + 인라인 `canWriteDeliveryRates(profile.role)` (`ADMIN`, `MANAGER`, `DELIVERY_AGENT`, `delivery-rates.ts:92-96`) + `DELIVERY_AGENT`인 경우 기존 행 `existing.org_id === profile.org_id` 검증 (`delivery-rates.ts:98-108` — 단, `data.org_id` 변경값 재검증 누락은 `DEF-149` 참조)
- **Input**: `id: string` (`zen_delivery_rates.id`), `data: Partial<CreateDeliveryRateData>`
- **Output**: `Promise<ActionResult<boolean>>` (`{ data: true, error: null } | { data: null, error: string }`)
- **오류**: 역할 불충족(`"배송 서비스 요율 수정 권한이 없습니다."`, `delivery-rates.ts:95`), 타 조직 요율 수정 시도(`"본인 조직의 요율만 수정할 수 있습니다."`, `delivery-rates.ts:106`), DB 업데이트 실패(`"배송 요율 수정 실패: ${error.message}"`, `delivery-rates.ts:129`) 시 `withAction` 경유 `{ data: null, error }` 반환
- **부수효과**: `revalidatePath('/admin/delivery-rates')` (`delivery-rates.ts:131`)

#### getDeliveryRates(orgId?, serviceType?)
- **Path**: `src/app/actions/admin/delivery-rates.ts:135-167` (`withAction` 미래핑)
- **설명**: 배송 서비스 요율 목록(`zen_delivery_rates` + `zen_organizations!inner(name)` 조인)을 생성일 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` (`delivery-rates.ts:136`, 별도 역할 차단 없음 — `DELIVERY_AGENT`는 본인 `profile.org_id`로 강제 필터링(`L151-153`), `CORPORATE`·`INDIVIDUAL`·`CARRIER`는 `is_active = true` 필터링(`L155-157`), `DEF-149` 참조)
- **Input**: `orgId?: string`, `serviceType?: 'LOCAL' | 'TOTAL'`
- **Output**: `Promise<DeliveryRate[]>` (`zen_organizations(name)` 포함 배열, `delivery-rates.ts:166`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 기록 후 `Error("배송 요율 조회 실패: ${error.message}")` 직접 throw (`delivery-rates.ts:161-164`)

#### deleteDeliveryRate(id)
- **Path**: `src/app/actions/admin/delivery-rates.ts:169-197` (`withAction` 래핑)
- **설명**: 배송 서비스 요율(`zen_delivery_rates.id`)을 비활성화(`is_active = false`, Soft Delete)합니다.
- **권한**: `validateUserAction()` + 인라인 역할 비교 (`ADMIN`, `MANAGER`, `DELIVERY_AGENT`만 허용, `delivery-rates.ts:170-174`) + `DELIVERY_AGENT`인 경우 `existing.org_id === profile.org_id` 본인 조직 검증 (`delivery-rates.ts:176-186`)
- **Input**: `id: string` (`zen_delivery_rates.id`)
- **Output**: `Promise<ActionResult<boolean>>` (`{ data: true, error: null } | { data: null, error: string }`)
- **오류**: 역할 불충족(`"배송 서비스 요율 삭제 권한이 없습니다."`, `delivery-rates.ts:173`), 타 조직 삭제 시도(`"본인 조직의 요율만 삭제할 수 있습니다."`, `delivery-rates.ts:184`), DB 업데이트 실패(`"배송 요율 삭제 실패: ${error.message}"`, `delivery-rates.ts:193`) 시 `withAction` 경유 `{ data: null, error }` 반환
- **부수효과**: `revalidatePath('/admin/delivery-rates')` (`delivery-rates.ts:195`)

### 12.3 운송사 부가할증료 관리 (`src/app/actions/admin/surcharges.ts`)

#### createSurcharge(data)
- **Path**: `src/app/actions/admin/surcharges.ts:21-48` (`withAction` 미래핑)
- **설명**: 운송사별 부가할증료(`zen_surcharges`, `is_active: true`)를 신규 등록합니다.
- **권한**: `validateUserAction()` + 인라인 `profile.role === USER_ROLES.ADMIN` 단독 허용 (`src/app/actions/admin/surcharges.ts:22-26`)
- **Input**: `data: CreateSurchargeData` (`{ carrier_id: string, surcharge_type: string, transport_mode: string, rate_type: string, amount: number, currency: string, valid_from: string, valid_until?: string | null }`, `surcharges.ts:8-17`)
- **Output**: `Promise<{ success: true; surcharge: Record<string, unknown> }>` (`surcharges.ts:47`)
- **오류**: `ADMIN` 역할이 아닐 때 `Error("Surcharge creation requires ADMIN role.")` 직접 throw (`surcharges.ts:25`); DB insert 실패 시 `Error("Surcharge creation failed: ${error.message}")` 직접 throw (`surcharges.ts:44`)
- **부수효과**: `revalidatePath('/admin/rate-cards')` (`surcharges.ts:46`)

#### updateSurcharge(id, data)
- **Path**: `src/app/actions/admin/surcharges.ts:50-68` (`withAction` 미래핑)
- **설명**: 기존 부가할증료(`zen_surcharges.id`) 정보를 수정합니다.
- **권한**: `validateUserAction()` + 인라인 `profile.role === USER_ROLES.ADMIN` 단독 허용 (`src/app/actions/admin/surcharges.ts:51-55`)
- **Input**: `id: string` (`zen_surcharges.id`), `data: UpdateSurchargeData` (`Partial<CreateSurchargeData>`, `surcharges.ts:19`)
- **Output**: `Promise<{ success: true; surcharge: Record<string, unknown> }>` (`surcharges.ts:67`)
- **오류**: `ADMIN` 역할이 아닐 때 `Error("Surcharge update requires ADMIN role.")` 직접 throw (`surcharges.ts:54`); DB 업데이트 실패 시 `Error("Surcharge update failed: ${error.message}")` 직접 throw (`surcharges.ts:64`)
- **부수효과**: `revalidatePath('/admin/rate-cards')` (`surcharges.ts:66`)

#### deleteSurcharge(id)
- **Path**: `src/app/actions/admin/surcharges.ts:70-86` (`withAction` 미래핑)
- **설명**: 부가할증료(`zen_surcharges.id`)를 비활성화(`is_active = false`, Soft Delete)합니다.
- **권한**: `validateUserAction()` + 인라인 `profile.role === USER_ROLES.ADMIN` 단독 허용 (`src/app/actions/admin/surcharges.ts:71-75`)
- **Input**: `id: string` (`zen_surcharges.id`)
- **Output**: `Promise<{ success: true }>` (`surcharges.ts:85`)
- **오류**: `ADMIN` 역할이 아닐 때 `Error("Surcharge deletion requires ADMIN role.")` 직접 throw (`surcharges.ts:74`); DB 업데이트 실패 시 `Error("Surcharge deletion failed: ${error.message}")` 직접 throw (`surcharges.ts:82`)
- **부수효과**: `revalidatePath('/admin/rate-cards')` (`surcharges.ts:84`)

#### getSurcharges()
- **Path**: `src/app/actions/admin/surcharges.ts:88-101` (`withAction` 미래핑)
- **설명**: 전체 부가할증료 목록(`zen_surcharges` + `carrier:zen_carriers!carrier_id(code, name, transport_mode)` 조인)을 생성일 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/admin/surcharges.ts:89`, 로그인 세션만 검증하며 별도 역할 가드 및 `is_active` 필터 없음 — `DEF-149` 참조)
- **Input**: 없음 (`()`)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`zen_surcharges` 행 및 `carrier` 조인 배열, `surcharges.ts:100`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `Error("Failed to fetch surcharges: ${error.message}")` 직접 throw (`surcharges.ts:99`)

---


### 12.4 관리자 요율 카드 관리 Actions — 실사용 UI 연동 (`src/app/actions/admin/rate-cards.ts` — TASK-1165 / Issue #1378)

> **중복 모듈 실사용 확인 (`rates.ts` vs `rate-cards.ts`)**: `src/`·`tests/` 전수 검색 결과 `admin/rate-cards.ts`는 파일 상단에 `@deprecated` 주석이 있으나 실제 UI(`src/app/[locale]/(dashboard)/admin/rate-cards/RateCardsTab.tsx:6`)에서 4개 함수 전부를 import해 사용 중이다. 반면 `admin/rates.ts`(`§12.5`)는 현재 어디에서도 import되지 않는 미연동 상태다 (`DEF-152` 참조).

#### createRateCard(data) — `admin/rate-cards.ts`
- **Path**: `src/app/actions/admin/rate-cards.ts:44-86` (`@deprecated` 표기지만 실사용 중)
- **설명**: 운송사·운송모드별 기간 중복(`validateRateOverlap`)을 검사한 뒤 `zen_rate_cards`에 무게(`weight_slabs`)·부피(`cbm_slabs`) 요율 카드를 신규 등록합니다 (`currency` 기본 `'USD'`, `margin_rate` 기본 `15.0`, `platform_fee_rate` 기본 `5.0`).
- **권한**: `validateUserAction()` + `profile.role === USER_ROLES.ADMIN` 단독 허용 (`rate-cards.ts:45-49`)
- **Input**: `data: CreateRateCardData` (`{ carrier_id, transport_mode, currency, tiers: { weight_slabs, cbm_slabs }, valid_from, valid_until?, carrier_cost?, margin_rate?, platform_fee_rate? }`, `rate-cards.ts:12-25`)
- **Output**: `Promise<{ success: true; card: Record<string, unknown> }>` (`rate-cards.ts:85`)
- **오류**: 비관리자 시 `Error("Rate card creation requires ADMIN role.")` throw(`L48`); 슬랩 누락 시 `Error("Both weight_slabs and cbm_slabs must have at least 1 entry.")` throw(`L52`); 기간 중복 시 `Error("${e.valid_from}~${e.valid_until || '∞'} 기간에 이미 등록된 요율이 있습니다")` throw(`L38, L63`); DB 실패 시 `Error("Rate card creation failed: ${error.message}")` throw(`L82`)
- **부수효과**: `zen_rate_cards` INSERT(`L65-80`), `revalidatePath('/admin/rate-cards')`(`L84`)

#### updateRateCard(id, data) — `admin/rate-cards.ts`
- **Path**: `src/app/actions/admin/rate-cards.ts:88-126`
- **설명**: 기존 요율 카드(`zen_rate_cards.id`)를 수정합니다 (`CARRIER` 역할은 `zen_carriers.org_id === profile.org_id` 본인 운송사 카드만 수정 가능).
- **권한**: `validateUserAction()` + `ADMIN`·`MANAGER` 또는 본인 운송사 `CARRIER` (`rate-cards.ts:89-113`)
- **Input**: `id: string`, `data: Partial<CreateRateCardData>` (`rate-cards.ts:27`)
- **Output**: `Promise<{ success: true; card: Record<string, unknown> }>` (`rate-cards.ts:125`)
- **오류**: 미존재 시 `Error("Rate card not found.")` throw(`L100`); 타 운송사 시 `Error("본인 운송사 요율만 수정 가능합니다.")` throw(`L109`); 권한 불충족 시 `Error("Rate card update requires ADMIN, MANAGER, or CARRIER role.")` throw(`L112`); DB 실패 시 `Error` throw(`L122`)
- **부수효과**: `zen_rate_cards` UPDATE(`L115-120`), `revalidatePath('/admin/rate-cards')`(`L124`)

#### deleteRateCard(id) — `admin/rate-cards.ts`
- **Path**: `src/app/actions/admin/rate-cards.ts:128-144`
- **설명**: 지정 요율 카드(`zen_rate_cards.id`)를 비활성화(`is_active = false`, Soft Delete)합니다.
- **권한**: `validateUserAction()` + `profile.role === USER_ROLES.ADMIN` 단독 허용 (`rate-cards.ts:129-133`)
- **Input**: `id: string` (`zen_rate_cards.id`)
- **Output**: `Promise<{ success: true }>` (`rate-cards.ts:143`)
- **오류**: 비관리자 시 `Error("Rate card deletion requires ADMIN role.")` throw(`L132`); DB 실패 시 `Error("Rate card deletion failed: ${error.message}")` throw(`L140`)
- **부수효과**: `zen_rate_cards.is_active = false` UPDATE(`L135-138`), `revalidatePath('/admin/rate-cards')`(`L142`)

#### getRateCards() — `admin/rate-cards.ts`
- **Path**: `src/app/actions/admin/rate-cards.ts:146-160`
- **설명**: 전체 요율 카드 목록(`zen_rate_cards` + `carrier:zen_carriers!carrier_id(code, name, transport_mode)`, `carrier_cost`·`margin_rate`·`platform_fee_rate` 포함)을 생성일 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` (`rate-cards.ts:147`, 로그인 세션만 검증하며 역할 가드 및 `CARRIER` 본인 필터링·`platform_fee_rate` 마스킹 없음 — `DEF-152` 참조)
- **Input**: 없음 (`()`)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`data || []`)
- **오류**: DB 조회 실패 시 `Error("Failed to fetch rate cards: ${error.message}")` throw(`L158`)

### 12.5 관리자 요율 카드 관리 Actions — TISA 3계층 미연동 모듈 (`src/app/actions/admin/rates.ts` — TASK-1165 / Issue #1378)

> **미연동 상태**: `src/`·`tests/` 내 import 참조 **0건**(dead code 후보, `DEF-152` 참조). `withAction` 래퍼 적용 시 반환형이 `ActionResult<T>`로 감싸집니다.

#### createRateCard(payload) — `admin/rates.ts`
- **Path**: `src/app/actions/admin/rates.ts:71-168` (`withAction` 래핑)
- **설명**: 동일 운송사·운송모드·출발/도착항(`origin_port_id`·`dest_port_id`)의 기존 활성 카드를 `supersedeRateCards()`로 대체 비활성화한 뒤 신규 요율 카드를 등록하고, `surcharges`가 있으면 `zen_rate_surcharges`에 함께 저장하며 출발/도착항이 모두 있으면 `zen_route_network`를 자동 upsert(`autoCreateRouteNetwork`)합니다.
- **권한**: `validateUserAction()` + `ADMIN`·`MANAGER` 또는 본인 운송사 `CARRIER` (`rates.ts:91-113`)
- **Input**: `payload: { card: { carrier_id, transport_mode, currency?, origin_port_id?, dest_port_id?, transit_days?, tiers: { weight_slabs, cbm_slabs }, valid_from, valid_to?, carrier_cost?, margin_rate?, platform_fee_rate? }; surcharges?: any[] }` (`rates.ts:71-90`)
- **Output**: `Promise<ActionResult<Record<string, unknown>>>` (`withAction` 래핑, 내부 반환 `card`, `currency` 기본 `'USD'`, `margin_rate` `15.0`, `platform_fee_rate` `5.0`)
- **오류**: 권한·필수값(`carrier_id`, `transport_mode`, 슬랩)·타 운송사·DB 실패 시 throw(`withAction`이 `{ success: false, error }`로 변환)
- **부수효과**: `zen_rate_cards` supersede UPDATE + INSERT(`L125-142`), `zen_rate_surcharges` INSERT(`L151`), `zen_route_network` UPSERT(`L156`), `revalidatePath("/admin/rates")`(`L166`)

#### updateRateCard(cardId, data) — `admin/rates.ts`
- **Path**: `src/app/actions/admin/rates.ts:170-222` (`withAction` 래핑)
- **설명**: 지정 요율 카드(`zen_rate_cards.id`)의 요율·기간·경로·활성 여부를 수정합니다.
- **권한**: `validateUserAction()` + `ADMIN`·`MANAGER` 또는 본인 운송사 `CARRIER` (`rates.ts:187-211`)
- **Input**: `cardId: string`, `data: { transport_mode?, currency?, origin_port_id?, dest_port_id?, transit_days?, tiers?, valid_from?, valid_to?, carrier_cost?, margin_rate?, platform_fee_rate?, is_active? }` (`L170-186`)
- **Output**: `Promise<ActionResult<true>>` (`withAction` 래핑)
- **오류**: 미인증·권한·타 운송사·미존재·DB 실패 시 throw(`withAction` 오류 응답 변환)
- **부수효과**: `zen_rate_cards` UPDATE(`L213-216`), `revalidatePath("/admin/rates")`(`L220`)

#### deleteRateCard(cardId) — `admin/rates.ts`
- **Path**: `src/app/actions/admin/rates.ts:227-240` (`withAction` 래핑)
- **설명**: 지정 요율 카드(`zen_rate_cards.id`)를 `AdminRepository.deleteRateCard()`로 비활성화(`is_active = false`)합니다.
- **권한**: `validateUserAction()` + `profile.role === USER_ROLES.ADMIN` 단독 허용 (`rates.ts:228-233`)
- **Input**: `cardId: string`
- **Output**: `Promise<ActionResult<true>>` (`withAction` 래핑)
- **오류**: 비관리자 시 `Error("요율 삭제 권한은 관리자(ADMIN)만 가능합니다.")` throw(`L232`); DB 실패 시 throw
- **부수효과**: `zen_rate_cards.is_active = false` UPDATE(`L235`), `revalidatePath("/admin/rates")`(`L238`)

#### getRateCards(filters?) — `admin/rates.ts`
- **Path**: `src/app/actions/admin/rates.ts:245-311` (`withAction` 미래핑)
- **설명**: 필터(`transport_mode`, `carrier_id`, `is_active`, 페이지네이션) 기반으로 `zen_rate_cards`와 연결된 `zen_rate_surcharges` 목록을 조회합니다 (`CARRIER` 호출 시 본인 `carrier_id`로 강제 제한하고 `platform_fee_rate` 필드를 제거해 반환).
- **권한**: `validateUserAction()` + `ADMIN`·`MANAGER`·`CARRIER` 허용 (`rates.ts:252-267`)
- **Input**: `filters?: { transport_mode?: string; carrier_id?: string; is_active?: boolean; page?: number; pageSize?: number }` (기본 `page=1`, `pageSize=50`)
- **Output**: `Promise<{ rateCards: Array<Record<string, unknown>>; total: number }>` (`L304-310`)
- **오류**: 권한 불충족 시 `Error("요율 조회 권한이 없습니다.")` throw(`L255`); DB 실패 시 `logger.error` 후 `Error("Rates query failed: ${error.message}")` throw(`L280-281`)

### 12.6 관리자 일자별 환율 관리 Actions (`src/app/actions/admin/exchange-rates.ts` — TASK-1165 / Issue #1378)

#### listExchangeRates(page?, pageSize?)
- **Path**: `src/app/actions/admin/exchange-rates.ts:22-35`
- **설명**: `zen_exchange_rates` 테이블에서 일자별 환율 이력(`source: 'KOREAEXIM_API' | 'MANUAL'`)을 `rate_date` 내림차순으로 페이지네이션 조회합니다 (TASK-B-257).
- **권한**: `validateAdminAction()` (`exchange-rates.ts:23`, 플랫폼 관리자급 권한 필수)
- **Input**: `page = 1`, `pageSize = 50`
- **Output**: `Promise<{ rates: ExchangeRateRow[]; total: number }>` (`exchange-rates.ts:8-19, 34`)
- **오류**: 권한 실패 시 `validateAdminAction()` 예외/리다이렉트; DB 조회 실패 시 `Error("환율 이력 조회 실패: ${error.message}")` throw(`L33`)

#### setManualExchangeRate(payload)
- **Path**: `src/app/actions/admin/exchange-rates.ts:38-68`
- **설명**: 수동 보정 환율을 Zod 검증(`setManualExchangeRateSchema`) 및 `validateAdminAction()` 통과 후 `zen_exchange_rates`에 `source: 'MANUAL'`·`is_active: true`로 Upsert(`onConflict: 'base_currency,quote_currency,rate_date'`)합니다.
- **권한**: `validateAdminAction()` (`exchange-rates.ts:44`, 플랫폼 관리자급 권한 필수)
- **Input**: `payload: unknown` → Zod 검증 후 `{ base_currency: string(3, 기본 'USD'), quote_currency: string(3, 기본 'KRW'), rate: number(>0), rate_date: 'YYYY-MM-DD' }` (`src/lib/validation/schemas.ts:63-68`)
- **Output**: `Promise<{ success: true; data: ExchangeRateRow }>` (`exchange-rates.ts:67`)
- **오류**: Zod 검증 실패 시 `Error("입력 검증 실패: ${validated.error}")` throw(`L41`); 권한 실패 시 `validateAdminAction()` 예외; DB Upsert 실패 시 `Error("환율 보정 저장 실패: ${error.message}")` throw(`L65`)
- **부수효과**: `zen_exchange_rates` UPSERT(`L47-63`), `revalidatePath('/admin/exchange-rates')`(`L66`)

#### getExchangeRateSyncStatus()
- **Path**: `src/app/actions/admin/exchange-rates.ts:71-95`
- **설명**: `zen_exchange_rates`에서 `source = 'KOREAEXIM_API'` 최신 수집 행 1건을 조회해 오늘(`getKstToday()`) 자동 수집 완료 여부(`syncedToday`)와 최종 수집 시각·환율을 반환합니다.
- **권한**: `validateAdminAction()` (`exchange-rates.ts:72`, 플랫폼 관리자급 권한 필수)
- **Input**: 없음 (`()`)
- **Output**: `Promise<{ lastFetchedAt: string | null; lastRateDate: string | null; lastRate: number | null; syncedToday: boolean }>` (`L89-94`)
- **오류**: 권한 실패 시 `validateAdminAction()` 예외 throw

### 12.7 관리자 운송 정책 설정 Actions (`src/app/actions/admin/transport-policies.ts` — TASK-1165 / Issue #1378)

#### getTransportPolicies()
- **Path**: `src/app/actions/admin/transport-policies.ts:27-41` (`withAction` 미래핑)
- **설명**: 운송 모드별(`AIR | SEA | LAND | EXP`) 요금 산정 방식(`WEIGHT_ONLY | VOLUMETRIC | WM`) 및 부피중량 제수(`volumetric_divisor`) 정책 목록(`zen_transport_pricing_policies`)을 `transport_mode` 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` (`transport-policies.ts:28`, 로그인 세션만 검증하며 별도 역할 가드 없음)
- **Input**: 없음 (`()`)
- **Output**: `Promise<TransportPolicy[]>` (`transport-policies.ts:9-21, 40`, `data || []`)
- **오류**: 미인증 시 `validateUserAction()` 예외 throw; DB 실패 시 `logger.error` 후 `Error("운송 정책 조회 실패: ${error.message}")` throw(`L36-37`)

#### updateTransportPolicy(id, data)
- **Path**: `src/app/actions/admin/transport-policies.ts:43-66` (`withAction` 래핑)
- **설명**: 지정 운송 정책(`zen_transport_pricing_policies.id`)의 산정 방식(`pricing_method`), 부피중량 제수(`volumetric_divisor`), 설명(`description`), 활성 여부(`is_active`)와 `updated_by`를 수정합니다.
- **권한**: `validateUserAction()` + `canWrite(profile.role)` (`ADMIN`·`ZENITH_SUPER_ADMIN`만 허용, `transport-policies.ts:23-25, 44-48`)
- **Input**: `id: string`, `data: Partial<TransportPolicyData>` (`{ transport_mode, pricing_method, volumetric_divisor, description, is_active }`, `L9-15`)
- **Output**: `Promise<ActionResult<true>>` (`withAction` 래핑)
- **오류**: 권한 불충족 시 `Error("운송 정책 수정 권한이 없습니다.")` throw(`L47`); DB 업데이트 실패 시 `Error("운송 정책 수정 실패: ${error.message}")` throw(`L62`, `withAction`이 `{ success: false, error }`로 변환)
- **부수효과**: `zen_transport_pricing_policies` UPDATE(`L57-60`), `revalidatePath('/admin/settings/transport-policies')`(`L64`)
