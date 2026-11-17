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

