### 11.12 Agency 화주 및 구간 할인 관리 Actions (TASK-1159 / Issue #1345)

#### getAgencyOrgIdByShipper(shipperOrgId)
- **Path**: `src/app/actions/agency/shipper-link.ts:6-17`
- **설명**: 화주 조직 ID(`shipperOrgId`)로 연결된 활성 대리점 조직 ID(`zen_agency_shippers.agency_org_id`, `is_active = true`)를 단건 조회합니다.
- **권한**: `validateUserAction()` (로그인 세션 검증 + 액션 내 소유권 가드 없음 — **단, 일반 세션 클라이언트라 `zen_agency_shippers` RLS 정책이 적용됨을 실DB로 확인**: 대리점/화주 각각 자기 연결은 반환, 타 대상은 `null` → **수정 불필요**, TASK-B-374 점검 결과 TC-374-06)
- **Input**: `shipperOrgId: string` (화주 조직 UUID)
- **Output**: `Promise<string | null>` (연결된 `agency_org_id` 또는 `null`)
- **오류**: 미인증/프로필 부재 시 `Error("Login required")` / `Error("Profile not found")` throw (`validateUserAction`); DB 조회 실패 시 `Error("대리점 조회 실패: ${error.message}")` throw (`shipper-link.ts:15`)

#### getAgencyShippers(agencyOrgId)
- **Path**: `src/app/actions/agency/shippers.ts:118-157`
- **설명**: 특정 대리점(`agencyOrgId`) 소속 화주 연결 목록(`zen_agency_shippers`)과 화주 조직 상세(`shipper:shipper_org_id` 조인)를 생성일 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY`) + **대리점 소유권 검증** — `agencyOrgId === profile.org_id`를 확인하지 않으면 거부 (`ownAgencyError()`, TASK-B-374 / **DEF-149 §1.1 수정 반영**). `ZENITH_SUPER_ADMIN`은 `checkPermission` 전역 바이패스와 정합하여 예외
- **Input**: `agencyOrgId: string` (대리점 조직 UUID)
- **Output**: `Promise<{ shippers: AgencyShipperRow[] }>` (`src/types/agency.ts:14-25`)
- **오류**: 미인증(`"Login required"` / `"Profile not found"`), 역할 불충족 시 `trError('permission_denied')` throw, **타 대리점 소유 시 `logger.warn` 후 `trError('own_agency_only')` throw** (`ownAgencyError()`); DB 조회 실패 시 `logger.error` 기록 후 `Error("Failed to fetch agency shippers: ...")` throw

#### createAgencyShipper(agencyOrgId, shipperData)
- **Path**: `src/app/actions/agency/shippers.ts:163-273`
- **설명**: 대리점 소속 신규 화주 계정(Supabase Auth 사용자 + `zen_organizations` + `zen_profiles` + `zen_agency_shippers` 연결)을 생성하고 임시 비밀번호 환영 이메일을 발송합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY`) + **대리점 소유권 검증** — `agencyOrgId !== profile.org_id`이면 **생성 부수효과(Auth·조직·연결) 전에** 거부 (`ownAgencyError()`, **DEF-149 §1.1 수정 반영**)
- **Input**: `agencyOrgId: string`, `shipperData: CreateAgencyShipperInput` (`CreateAgencyShipperSchema` Zod 검증: `name`, `shipper_type: 'INDIVIDUAL'|'CORPORATE'`, `discount_rate: 0~0.9999`, `login_email`, 법인 시 `biz_no` 필수 등, `src/lib/validations/agency.ts:3-34`)
- **Output**: `Promise<CreateAgencyShipperResult>` (`{ success: true; shipperId: string; inviteEmailSent: boolean } | { success: false; fieldErrors: Record<string, string> }`, `shippers.ts:159-161`)
- **오류**: 역할 불충족 시 `{ success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } }` (`shippers.ts:169`); **타 대리점 소유 시 `logger.warn` 후 `{ _form: trError('own_agency_only') }` 반환** (`ownAgencyError()`, **DEF-149 §1.1 수정 반영**); Zod 검증 실패 시 필드별 오류 맵 반환 (`shippers.ts:173-180`); Auth 생성 실패 시 `{ success: false, fieldErrors: { login_email: authError.message } }` (`shippers.ts:194-196`); 조직/프로필/연결 생성 실패 시 `_rollbackShipper()` 수행 후 `{ success: false, fieldErrors: { _form: '화주 조직/프로필/연결 생성에 실패했습니다.' } }` 반환 (`shippers.ts:235-259`)
- **부수효과**: `supabase.auth.admin.createUser` 호출(`shippers.ts:189`), `sendShipperWelcomeEmail` 발송(실패 시 `logger.warn` 기록 후 비차단 진행, `shippers.ts:201-211`), `syncAuthMetadata`(`role: 'AGENCY_SHIPPER'`, `org_type: 'SHIPPER'`, `shippers.ts:264-269`), `revalidatePath('/agency/shippers')` (`shippers.ts:271`)

#### updateAgencyShipperGrade(id, grade, discountRate)
- **Path**: `src/app/actions/agency/shippers.ts:275-308`
- **설명**: 대리점-화주 연결 행(`zen_agency_shippers.id`)의 등급(`grade`)과 할인율(`discount_rate`)을 수정합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY`) + **대리점 소유권 검증** — UPDATE 전에 대상 행의 `agency_org_id`를 조회해 `profile.org_id`와 비교하고, 다르면 거부 (`ownAgencyError()`, **DEF-149 §1.1 수정 반영**). **역마진 가드는 미적용 유지** — `validateAgencyReverseMargin()`은 `zone_id` 인자 기반(zone 요율 전용)이라 `grade`/`discount_rate` 수정에는 대응 컨텍스트가 없음 → IMP 제안으로 추적
- **Input**: `id: string` (`zen_agency_shippers.id`), `grade: string` (최대 20자), `discountRate: number` (`0 ~ 0.9999`, `UpdateAgencyShipperGradeSchema`, `src/lib/validations/agency.ts:36-39`)
- **Output**: `Promise<{ success: true }>` (`shippers.ts:307`)
- **오류**: 역할 불충족 시 `trError('permission_denied')` throw; Zod 검증 실패 시 `Error("Validation failed: ...")` throw; 연결 행 미존재 시 `Error('Shipper not found')`; **타 대리점 소유 시 `logger.warn` 후 `trError('own_agency_only')` throw**; 조회/업데이트 실패 시 `logger.error` 후 `Error(...)` throw
- **부수효과**: `revalidatePath('/agency/shippers')` (`shippers.ts:306`)

#### getAgencyShipperById(shipperId)
- **Path**: `src/app/actions/agency/shippers.ts:310-350`
- **설명**: 대리점-화주 연결 ID(`shipperId`)로 단건 연결 정보 및 화주 조직 상세(`org:shipper_org_id` 주소·담당자 포함)를 조회합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY`) + **대리점 소유권 검증** — 조회 성공 후 행의 `agency_org_id !== profile.org_id`이면 거부 (`ownAgencyError()`, **DEF-149 §1.1 수정 반영**)
- **Input**: `shipperId: string` (`zen_agency_shippers.id`)
- **Output**: `Promise<{ shipper: Record<string, unknown> }>` (`zen_agency_shippers` 단건 + `org` 조인 객체, `shippers.ts:349`)
- **오류**: 역할 불충족 시 `trError('permission_denied')` throw; **타 대리점 소유 시 `logger.warn` 후 `trError('own_agency_only')` throw**; DB 조회 실패 시 `logger.error` 기록 후 `Error("Failed to fetch shipper: ...")` throw

#### updateAgencyShipper(shipperId, data)
- **Path**: `src/app/actions/agency/shippers.ts:356-427`
- **설명**: 대리점 소속 화주의 조직 정보(`zen_organizations`)와 연결 설정(`zen_agency_shippers`: `shipper_type`, `discount_rate`, `grade`, `is_active`)을 수정합니다 (`INDIVIDUAL` 유형은 `discount_rate = 0` 강제).
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY`) + **대리점 소유권 검증** — 연결 행을 `shipper_org_id, agency_org_id`로 조회해 `profile.org_id`와 비교하고, 다르면 **조직 UPDATE 전에** 거부 (`ownAgencyError()`, **DEF-149 §1.1 수정 반영**)
- **Input**: `shipperId: string` (`zen_agency_shippers.id`), `data: UpdateAgencyShipperInput` (`UpdateAgencyShipperSchema` Zod 검증, `src/lib/validations/agency.ts:41-70`)
- **Output**: `Promise<UpdateAgencyShipperResult>` (`{ success: true } | { success: false; fieldErrors: Record<string, string> }`, `shippers.ts:352-354, 426`)
- **오류**: 역할 불충족 시 `{ success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } }` 반환; **타 대리점 소유 시 `logger.warn` 후 `{ _form: trError('own_agency_only') }` 반환** (`ownAgencyError()`); Zod 검증 실패 시 `{ success: false, fieldErrors }` 반환 (`shippers.ts:366-373`); 연결 행 미존재 시 `Error("Shipper not found")` throw (`shippers.ts:386`); 조직/화주 업데이트 실패 시 `Error("Failed to update org/shipper: ...")` throw (`shippers.ts:407, 422`)
- **부수효과**: `revalidatePath('/agency/shippers')` (`shippers.ts:425`)

#### getShipperZoneDiscounts(shipperOrgId)
- **Path**: `src/app/actions/agency/zone-discounts.ts:9-26`
- **설명**: 특정 화주 조직(`shipperOrgId`)에 설정된 UPS Zone별 할인율 목록(`zen_agency_shipper_zone_discounts`)을 조회합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/zone-discounts.ts:10-13`, 허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY`, 일반 세션 클라이언트 `supabase` 사용으로 RLS 적용)
- **Input**: `shipperOrgId: string` (화주 조직 UUID)
- **Output**: `Promise<Array<{ zone_id: string; discount_rate: number }>>` (`zone-discounts.ts:25`)
- **오류**: 역할 불충족 시 `Error("접근 권한이 없습니다.")` throw (`zone-discounts.ts:12`); DB 조회 실패 시 `logger.error` 기록 후 `Error("할인율 정보를 불러오는데 실패했습니다.")` throw (`zone-discounts.ts:20-23`)

#### upsertShipperZoneDiscounts(shipperOrgId, zoneRates, productIds?)
- **Path**: `src/app/actions/agency/zone-discounts.ts:28-99`
- **설명**: 소속 화주(`shipperOrgId`)의 UPS Zone별 할인율을 역마진 검증(`validateAgencyReverseMargin`) 및 최대 허용 할인율 검증(`getMaxAllowedZoneDiscount`) 통과 후 `zen_agency_shipper_zone_discounts`에 Upsert합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/zone-discounts.ts:33-36`) + `agencyOrgId === profile.org_id` 본인 대리점 소속 화주 검증 (`zone-discounts.ts:49-61`)
- **Input**: `shipperOrgId: string`, `zoneRates: Record<string, number>` (`zoneId -> discount_rate`), `productIds?: string[]`
- **Output**: `Promise<{ success: true } | { success: false; fieldErrors: { _form: string } }>` (`zone-discounts.ts:94, 98`)
- **오류**: 역할 불충족(`'접근 권한이 없습니다.'`), 비화주 조직(`'유효하지 않은 화주입니다.'`), 대리점 미연결(`'대리점 연결 정보를 찾을 수 없습니다.'`), 타 대리점 소속(`'본인 소속 화주가 아닙니다.'`), 역마진·원가 마진 초과·DB upsert 실패 시 `logger.error` 기록 후 `{ success: false, fieldErrors: { _form: errors.join('\n') } }` 반환 (`zone-discounts.ts:35-95`)
- **부수효과**: `revalidatePath('/agency/shippers')` (`zone-discounts.ts:97`)

### 11.13 UPS 실비 청구·대사 Actions (`src/app/actions/finance/ups-actual-charges.ts` — TASK-1162 / Issue #1354)

#### recordUpsActualCharges(orderId, charges)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:27-290`
- **설명**: UPS 오더(`IN_TRANSIT` 또는 `DELIVERED`)의 추가 실비 청구 항목(`zen_ups_actual_charges`)을 전체 교체 저장하고, 예상 비용 대비 차액(`adjustmentAmount`)을 `zen_order_costs`(`UPS_ACTUAL_ADJUSTMENT`) 및 연결 인보이스(`zen_invoices.total_amount`)에 반영합니다 (마감된 인보이스가 있으면 `createPostFinalizationAdjustment`로 추가 인보이스 발행).
- **권한**: `validateUserAction()` + `assertAdminOnly(profile)` — **`ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용**(JSJung 확정, TASK-B-372). AGENCY·화주·OPERATOR는 어떤 경로로도 불가하며 `permission_denied` + `logger.warn`. 가드 통과 후 DB 접근은 `createAdminClient()`로 수행합니다(SUPER_ADMIN이 `zen_ups_actual_charges` RLS 정책에 없어서 — RLS 정책 교체는 별도 Task). 금액은 `Number.isFinite` 검증 후 처리합니다.
- **Input**: `orderId: string` (오더 UUID), `charges: UpsActualChargeInput[]` (`Array<{ chargeType: string, amount: number, currency: string, upsInvoiceNo?: string, upsInvoiceDate?: string, notes?: string }>`, `L8-15`)
- **Output**: `Promise<{ success: boolean; adjustmentAmount?: number; error?: string }>` (`ups-actual-charges.ts:30, 146, 272`)
- **오류**: 권한 불충족(`permission_denied`, `L24`), 오더 미존재(`order_not_found`, `L45`), 비UPS 오더(`not_ups_order`, `L50`), 타 대리점 화주 오더(`shipper_scope_denied`, `L63`), 상태 부적합(`ups_actual_charge_status_invalid`, `L69`), 실비 삭제/삽입·조정 비용 반영·인보이스 금액 갱신·마감 후 조정 실패 또는 예외 발생 시 `logger.error` 기록 후 `{ success: false, error: await trError('generic', { code: ... }) }` 반환
- **부수효과**: `zen_ups_actual_charges` 기존 행 삭제 후 재삽입, 마감 인보이스 존재 시 `createPostFinalizationAdjustment` 호출, 미마감 시 `zen_order_costs`(`UPS_ACTUAL_ADJUSTMENT`) upsert/삭제 및 `zen_invoices.total_amount` 갱신, `revalidatePath(\`/orders/\${orderId}\`)`·`revalidatePath(\`/(dashboard)/orders/\${orderId}\`)`·`revalidatePath('/admin/ups-actual-charges')`

#### getUpsActualCharges(orderId)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:279-299`
- **설명**: 특정 UPS 오더(`orderId`)에 등록된 실비 청구 항목 목록(`zen_ups_actual_charges` + `entered_by_profile` 조인)을 등록일 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` + `assertAdminOnly(profile)` — **`ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용**(TASK-B-372). 비관리자는 `Error(permission_denied)` throw. 조회는 admin client 사용.
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`ups-actual-charges.ts:298`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'ACTUAL_CHARGES_LOOKUP' }))` throw (`L293-296`)

#### getUpsChargeReconciliation(orderId)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:301-364`
- **설명**: 특정 UPS 오더(`orderId`)의 예상 비용 합계(`zen_order_costs`), 실제 청구 합계(`estimated + zen_ups_actual_charges`), 차액(`variance`), 통화 및 인보이스 마감 여부를 대사하여 반환합니다.
- **권한**: `validateUserAction()` + `assertAdminOnly(profile)` — **`ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용**(TASK-B-372). 비관리자는 `Error(permission_denied)` throw. 조회는 admin client 사용.
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ estimated: number; estimatedBreakdown: Array<{ costType: string; amount: number; currency: string }>; actual: number; variance: number; currency: string; isFinalized: boolean; invoiceNo: string | null; invoiceDate: string | null }>` (`ups-actual-charges.ts:354-363`)
- **오류**: 예상 비용 조회 실패(`ESTIMATED_COST_LOOKUP`, `L311-314`) 또는 실비 조회 실패(`ACTUAL_CHARGES_LOOKUP`, `L333-336`) 시 `logger.error` 후 `Error(await trError('generic', ...))` throw

#### searchDeliveredUpsOrders(query)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:390-490`
- **설명**: 오더 번호(`order_no`) 또는 운송장 번호(`zen_tracking_configs.tracking_no`) 부분 일치(`ilike`)로 `IN_TRANSIT`·`DELIVERED` 상태의 UPS 오더 목록을 검색합니다.
- **권한**: `validateUserAction()` + `assertAdminOnly(profile)` — **`ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용**(TASK-B-372). 비관리자는 `Error(permission_denied)` throw. 1단계·2단계(tracking_no) 모두 admin client로 조회합니다.
- **Input**: `query: string` (공백 제거 후 빈 문자열이면 즉시 `[]` 반환, `L371-372`)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`ups-actual-charges.ts:453`)
- **오류**: 권한 불충족 시 `Error(permErr)` throw (`L369`); 오더 검색 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'ORDER_SEARCH' }))` throw (`L391-394`, 트래킹 번호 조회 에러는 `logger.error`만 기록 후 비차단 진행 `L416-418`)

### 11.14 UPS 실제 원가 확정·정산 마감 Actions (`src/app/actions/finance/ups-actual-cost.ts` — TASK-1162 / Issue #1354)

> **TASK-B-381 PR-4a(#1459) 변경**: `recordUpsActualCost`·`previewUpsActualCost`·`recordActualCostAndFinalize`·`markOrderCostSettled`·`recordUpsActualCharges`는 제거되었습니다. UPS 정산마감은 `Ds_11_11B §11.20`의 `finalizeUpsSettlement` 단일 경로를 사용합니다. 아래에는 잔존 액션만 기재합니다.


#### getOrderReleasedDate(supabase, orderId, fallbackCreatedAt?)
- **Path**: `src/lib/orders/order-released-date.ts:6-27` — **서버 액션이 아닌 내부 헬퍼**(TASK-B-372 / DEF-150 §1.2로 `'use server'` 파일에서 이동)
- **설명**: `order_status_history`에서 오더(`orderId`)가 `RELEASED` 상태로 전환된 최신 시각(없으면 `fallbackCreatedAt` 또는 당일)을 `YYYY-MM-DD` 문자열로 반환합니다.
- **권한**: 서버 액션 export가 아니므로 클라이언트에서 직접 호출할 수 없습니다. 호출자(`ups-actual-cost.ts`·오더정산 상세 서버 페이지)가 `validateUserAction()`/`requireAuth()`로 인증한 뒤 전달한 `supabase`(사용자 세션)로 실행됩니다.
- **Input**: `supabase: any` (SupabaseClient), `orderId: string`, `fallbackCreatedAt?: string`
- **Output**: `Promise<string>` (`YYYY-MM-DD`)
- **오류**: 별도 에러 throw 없이 조회 결과가 없으면 `fallbackCreatedAt` 또는 현재 UTC 날짜(`YYYY-MM-DD`) 반환

#### getUpsActualCost(orderId)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:72-91`
- **설명**: 특정 오더(`orderId`)의 UPS 실제 원가 확정 기록(`zen_ups_actual_cost` + `entered_by_profile` 조인)을 단건 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/ups-actual-cost.ts:73`, 로그인 세션만 검증하며 `assertAdmin` 역할 가드 없음 — `DEF-150` 참조)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<Record<string, unknown> | null>` (`ups-actual-cost.ts:90`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'ACTUAL_COST_LOOKUP' }))` throw (`L86-89`)

#### getOrdersForCostSettlement(filter)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:768-851`
- **설명**: 오더정산 대상 목록을 조회합니다(TASK-B-366 / Issue #1376). `DELIVERED` + `UPS` 오더를 대상으로 정산상태(`NOT_SETTLED`/`SETTLED`/`ALL`), 배송완료일 기간(`from`~`to`), 오더번호 검색어(`q`)로 필터링하고, 각 행에 배송완료일·정산상태·정산일시·UPS 청구서번호·실제원가 입력 여부를 담아 반환합니다. 기존 오더별 인보이스(`zen_invoices.metadata.source_order_id`)가 있는 오더는 목록에 **표시하되** `legacyInvoiced=true`·`excludedReason='LEGACY_INVOICED'`로 정산 대상에서 제외합니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (동일 파일 `L770-772`)
- **Input**: `filter: CostSettlementFilter` — `{ status: 'NOT_SETTLED' | 'SETTLED' | 'ALL', from: string, to: string, q?: string }`
- **Output**: `Promise<CostSettlementListResult>` — `{ success, orders?: CostSettlementOrderRow[], total?: number, error?: string }` (`L761-767`)
- **오류**: 권한 불충족(`permission_denied`), 기간 누락·역전(`generic{DATE_RANGE_INVALID}`, `L774-777`), 목록 조회 실패(`generic{ORDER_LIST_LOOKUP}`, `L789-792`), **보조 조회 실패는 fail-open 금지** — 배송완료일 `generic{HISTORY_LOOKUP}`, 원가 `generic{COST_LOOKUP}`, 레거시 인보이스 `generic{LEGACY_INVOICE_LOOKUP}`(`L801-814`), 예외 시 `generic{UNEXPECTED}`. 배송완료일(`order_status_history.next_status='DELIVERED'`)이 없거나 기간 밖인 오더는 결과에서 제외합니다(`L804-812`).

#### unmarkOrderCostSettled(orderId)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts` (`unmarkOrderCostSettled`)
- **설명**: UPS 오더의 오더정산을 되돌립니다(TASK-B-367 / Issue #1377, TASK-B-382 / Issue #1463). `cost_settlement_status`를 `NOT_SETTLED`로, `cost_settled_at`·`cost_settled_by`를 `NULL`로 복원합니다. **포함 여부는 `zen_billing_statement_order_included` RPC(SECURITY DEFINER, boolean 전용)로만 확인**하며, 상태 무관(tier 무관)으로 청구서에 포함된 오더는 `statement_includes_order`로 거부합니다. user-session client(`validateUserAction().supabase`)만 사용해 RLS를 우회하지 않고, 청구서 항목 테이블을 직접 조회하지 않습니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (동일 파일의 `ADMIN_ROLES` = `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`). RPC는 `authenticated` 세션으로 호출하고, 함수 내부에서 동일한 3역할을 재검사합니다.
- **Input**: `orderId: string`
- **Output**: `Promise<{ success: boolean, error?: string }>`
- **오류**: 권한 불충족(`permission_denied`), 오더 미존재(`order_not_found`), 정산 상태가 `SETTLED`가 아님(`not_found`), **포함 확인 RPC 오류·비정상 반환은 `generic{STATEMENT_ITEM_LOOKUP}`로 실패 처리(fail-closed — "청구서 없음"으로 오인 금지)**, 청구서 포함 오더(`statement_includes_order`), 조건부 UPDATE 실패(`generic{UNMARK_UPDATE}`), 조건부 UPDATE 영향 행 0건(동시 되돌리기 경합, `not_found`), 예외 시 `logger.error` + `generic{UNEXPECTED}`. 실패 분기마다 `logger.warn`/`logger.error`가 원본 오류와 함께 기록됩니다.
- **부수효과**: `zen_billing_statement_order_included(p_order_id)` RPC 호출, `zen_orders` 조건부 UPDATE(`WHERE id=$1 AND cost_settlement_status='SETTLED'`, 영향 행 0이면 실패), `revalidatePath(\`/(dashboard)/orders/\${orderId}\`, 'page')`·`revalidatePath('/admin/ups-actual-charges')`
- **제약**: "청구서 포함 확인 → UPDATE" 사이에 항목이 삽입될 수 있는 TOCTOU 경합은 **DB 트리거 방어를 IMP로 건의**(R-15 — IMP-198에 덧붙이지 않고 신규 번호 부여). #1475 병합 전/후 모두 MANAGER의 포함 오더 해제가 거부되어야 합니다.

---


### 11.19 UPS 정산 run 저장소·정산마감 RPC (TASK-B-381 / Issue #1459)

#### 테이블 3종 (append-only)
- **Path**: `supabase/migrations/20261126090000_task_b381_ups_settlement_run.sql`
- `zen_ups_settlement_runs` — `order_id`(FK, CASCADE) · `version` · `charge_weight_kg` · `currency='KRW'` · `source='UPS_SETTLEMENT'` · `settled_at` · `settled_by`(FK, **RESTRICT**) · `created_at`, `UNIQUE(order_id, version)`
- `zen_ups_settlement_run_amounts` — `run_id`(FK) · `tier`(`ADMIN_TO_AGENCY`|`SHIPPER`) · `base_freight` · `fuel_surcharge` · `surge_fee` · `other_charges` · `freight_adjustment` · `settlement_charges_total` · `line_total`, `PK(run_id, tier)`
- `zen_ups_settlement_run_charges` — `run_id` · `tier` · `line_no` · `name`(같은 이름 중복 허용) · `amount` · `currency`, `UNIQUE(run_id, tier, line_no)`
- **권한**: `REVOKE ALL` 후 `authenticated`·`service_role`에 **SELECT만**. 쓰기는 RPC만. RLS SELECT: 관리자 3역할 전체 · AGENCY 자기 `ADMIN_TO_AGENCY`+소속 화주 `SHIPPER` · 화주 계열 자기 `SHIPPER`만 · anon 차단.
- **불변성**: 3테이블 `BEFORE UPDATE/DELETE` 트리거(`zen_ups_settlement_run_immutable`) — append-only(재정산은 새 version).
- **주의**: 오더 삭제 CASCADE는 불변 트리거로 차단된다. `settled_by`는 감사 목적 `ON DELETE RESTRICT`.

#### RPC `finalize_ups_settlement_run(p_order_id uuid, p_charge_weight_kg numeric, p_amounts jsonb, p_charges jsonb)`
- **Path**: `supabase/migrations/20261126092000_task_b381_finalize_ups_settlement_run.sql`
- **권한**: `SECURITY DEFINER`, `SET search_path = public`, `REVOKE PUBLIC/anon` → `GRANT authenticated`. 함수 내부 `auth.uid()` 기준 **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만, actor 파라미터 없음.
- **동작**: 오더 `FOR UPDATE` 잠금 → UPS·`DELIVERED`·미정산 확인 → 비취소/PAID 인보이스 방어(`ups_invoice_exists`·`paid_invoice_exists`) → payload 불변식(`line_total`=4개 합+조정+부가항목 합, 부가항목 합=항목 합, tier 2개) → **같은 입력은 새 version 없이 반환**(오더가 `NOT_SETTLED`면 인보이스 방어 후 `SETTLED` 복구) → 새 version이면 run+amounts+charges 저장 + 오더 `SETTLED`를 한 트랜잭션으로 수행.
- **Input**: `p_amounts` 배열 2건(`tier`·4개 금액·`freight_adjustment`·`settlement_charges_total`·`line_total`), `p_charges` 배열(`tier`·`line_no`·`name`·`amount`)
- **Output**: `TABLE(run_id uuid, version integer)`
- **오류**: `profile_not_found`·`permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`ups_invoice_exists`·`paid_invoice_exists`·`invalid_run_payload`
- **부수효과**: `zen_ups_settlement_runs`/`_amounts`/`_charges` INSERT, `zen_orders.cost_settlement_*` UPDATE

#### 변경 RPC `billing_items_amounts(p_order_ids uuid[], p_tier text)`
- **Path**: `supabase/migrations/20261126091000_task_b381_billing_items_amounts.sql`
- **변경**: **최신 run만** 사용(레거시 `zen_order_costs`/스냅샷 폴백 제거). 반환 컬럼 7→**10**(`freight_adjustment`·`settlement_charges_total`·`charge_details` 추가). tier 매핑: `ADMIN_TO_AGENCY`→`ADMIN_TO_AGENCY`, 그 외→`SHIPPER`.
- **오류**: `settlement_run_missing`(run 없음)·`settlement_run_incomplete`(tier 금액 행 없음)
- **출력**: `order_id`·`charge_weight_kg`·4개 금액·`freight_adjustment`·`settlement_charges_total`·`line_total`·`charge_details`(jsonb)

#### 변경 RPC `create_billing_statement_with_items(...)`
- **Path**: 동일 M2 파일
- **변경**: `zen_billing_statement_items`에 `freight_adjustment`·`charge_details` 컬럼 반영, **비KRW 원장 통화 가드 제거**(run은 KRW 고정·원장 미사용). 그 외 로직 불변.

#### 컬럼 추가
- `zen_billing_statement_items.freight_adjustment numeric(14,2) NOT NULL DEFAULT 0`
- `zen_billing_statement_items.charge_details jsonb NOT NULL DEFAULT '[]'::jsonb`

### 11.20 UPS 정산마감 서버 액션 (TASK-B-381 PR-2 / Issue #1459)

- **Path**: `src/app/actions/finance/ups-settlement.ts` (`'use server'`), 계산·payload 헬퍼 `src/lib/ups/settlement/{types,build}.ts` (`server-only`, 액션 아님)
- **공통 계약**: `UpsSettlementInput` — `orderId`, 실측 중량/치수, `baseFreight`·`fuelSurcharge`·`surgeFee`(금액+통화), `otherCharges[]`(이름·금액·통화), `upsInvoiceNo`·`upsInvoiceDate`, `notes`. 반환 `UpsSettlementActionResult` — `{ success, error?, preview?, runId?, version? }`
- **공통 권한**: `validateUserAction()` + `hasAdminOrManagerRole(profile.role)` — **ADMIN·MANAGER·ZENITH_SUPER_ADMIN**만. 그 외 `permission_denied`. DB 접근은 세션 클라이언트만 사용한다(user-session RLS 유지).
- **공통 오류 문구**: `messages/{ko,en,zh,ja}.json`의 `Errors` 키로 반환한다(`ups_invoice_exists`·`paid_invoice_exists`·`settlement_run_missing`·`currency_conversion_failed`·`ups_estimate_unavailable`·`rpc_failed` 신규).

#### previewUpsSettlement(input)
- **설명**: DB 쓰기 없이 정산마감 결과를 미리 계산합니다. 출고확정일(`getOrderReleasedDate`) 기준 환율로 원가를 산출하고, `estimateUpsFreightCore`로 대리점·화주 2 tier의 run 금액·부가항목 payload를 만듭니다. `zen_order_costs`는 갱신하지 않으며 `UPS_ACTUAL_COST_ADJ` 델타도 만들지 않습니다(§2-1 4단계).
- **Input**: `UpsSettlementInput`
- **Output**: `Promise<UpsSettlementActionResult>` — `preview.releasedDate`·`chargeWeightKg`·`cost`(원가 요약)·`amounts[2]`·`charges[]`
- **오류**: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`(SETTLED 오더의 미리보기 거부)·`currency_conversion_failed`·`ups_estimate_unavailable`·`rpc_failed`
- **부수효과**: 조회만 (DB 변경 없음)

#### saveUpsSettlementDraft(input)
- **설명**: 임시저장 — `zen_ups_actual_cost` upsert + `zen_ups_actual_other_charges` 기존 행 삭제 후 재삽입만 수행합니다. run 생성·오더 `SETTLED` 전환은 하지 않습니다.
- **Input**: `UpsSettlementInput`
- **Output**: `Promise<UpsSettlementActionResult>` — `{ success: true }`
- **오류**: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`currency_conversion_failed`·`rpc_failed`
- **부수효과**: `zen_ups_actual_cost`/`zen_ups_actual_other_charges` 쓰기, `revalidatePath`(오더 상세·`/finance/daily-billing`)

#### finalizeUpsSettlement(input)
- **설명**: 정산마감 — 비취소/PAID 인보이스 선확인(보조) → 원가 저장 → run payload 계산 → `finalize_ups_settlement_run` RPC 1회로 run+amounts+charges+오더 `SETTLED`를 한 트랜잭션에서 처리합니다. **이미 `SETTLED`인 오더는 원가를 덮어쓰지 않고 RPC에 위임**하며, 같은 입력이면 기존 run을 멱등 반환하고 다른 입력이면 RPC가 `already_settled`로 거부합니다(§2-9).
- **Input**: `UpsSettlementInput`
- **Output**: `Promise<UpsSettlementActionResult>` — `{ success: true, runId, version }`
- **오류**: `permission_denied`·`order_not_found`·`not_ups_order`·`ups_actual_cost_status_invalid`·`already_settled`·`ups_invoice_exists`·`paid_invoice_exists`·`currency_conversion_failed`·`ups_estimate_unavailable`·`rpc_failed`(RPC 원문 오류 미노출, 코드만 매핑). 인보이스 선확인 조회 자체가 실패하면 **fail-closed**(`rpc_failed`)로 원가 선저장을 하지 않습니다.
- **관측성**: RPC 실패 시 `logger.error`를 **반환 이전에** 호출하고 오더·오류코드·원가 KRW 합계·부가항목 건수만 기록합니다(청구서 번호·거래처 값 비노출, R-21).
- **부수효과**: 원가 저장(미정산 오더만), RPC 호출, `revalidatePath` 3곳(오더 상세·`/finance/daily-billing`·`/finance/statements`)

#### 내부 헬퍼 (서버 액션 아님)
- `computeSettlementCost(supabase, order, input)` — `src/lib/ups/settlement/build.ts`
  - 출고확정일 기준 **통화별 환율을 `zen_exchange_rates`에서 직접 조회**하고, 유효 환율이 없으면 `getExchangeRate`의 최후 fallback(1350)을 쓰지 않고 `SettlementCurrencyError`를 던집니다(→ `currency_conversion_failed`). `computeUpsActualCostKrw`(기본운임 +7%)로 원가·계산 스냅샷을 만듭니다.
  - **Input**: 세션 client, `{ id, created_at }`, `UpsSettlementInput` / **Output**: `{ summary, amounts }`
- `buildSettlementPreview(supabase, order, input, cost)` — 동일 파일
  - `estimateUpsFreightCore`로 대리점·화주 tier 금액을 만들고, `freight_adjustment = target − (base+fuel+surge+other)`, `settlement_charges_total` = 항목별 2자리 반올림 합, `line_total = 4개 합 + 조정 + 부가항목 합`을 계산합니다(같은 부가항목을 양 tier에 적용).
  - **target 폴백**: 기존 `recomputeRevenue`와 동일하게 대리점 `agencyCostPrice <= 0`이면 플랫폼 합계를 target으로 씁니다(0원 target·과대 음수 조정 방지). 화주는 `finalFreight`, 없으면 플랫폼 합계입니다.
  - **중량 폴백**: 기존 경로와 동일하게 `actualWeightKg ?? snapshot.platform.chargeableWeightKg`.
  - **오류**: 상품을 찾을 수 없거나 도착국이 없으면 `SettlementEstimateError`(→ `ups_estimate_unavailable`). 스냅샷 합계로 조용히 폴백하지 않습니다.

