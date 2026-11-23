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

#### recordUpsActualCost(orderId, input)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:217-474`
- **설명**: UPS 오더(`IN_TRANSIT` 또는 `DELIVERED`)의 실제 원가(HKD 항목 합계 및 출고일 기준 HKD→KRW 환산 원가)를 `zen_ups_actual_cost`에 Upsert하고, 실측 중량/부피 입력 시 `estimateUpsFreight()`를 재호출해 대리점·화주 인보이스 금액을 연동 재계산합니다 (Issue #1009). **TASK-B-364(#1374)부터 원가 계산은 `computeUpsActualCostKrw()`(`src/lib/ups/actual-cost.ts`)로 통합되어 기본운임에만 `UPS_COST_SURCHARGE_RATE`(+7%)를 적용합니다**(이전에는 이 경로에 가산이 없었음). **TASK-B-366(#1376)부터 오더정산 완료(`cost_settlement_status='SETTLED'`) 오더는 원가·중량 수정을 거부하며**, 저장 시 계산 규칙 스냅샷(`cost_surcharge_rate`·`cost_surcharge_amount_krw`·`applied_exchange_rates`·`calc_version=2`)을 함께 기록합니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (`src/app/actions/finance/ups-actual-cost.ts:44-48, 161-163`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용)
- **Input**: `orderId: string`, `input: UpsActualCostInput & { baseFreightKrw?, baseFreightCurrency?, fuelSurchargeKrw?, surgeFeeKrw?, otherChargesKrw?, otherCharges?: Array<{ name, amount, currency }> }` (`{ upsInvoiceNo?, upsInvoiceDate?, actualWeightKg?, actualLengthCm?, actualWidthCm?, actualHeightCm?, baseFreightHkd?, baseFreightCurrency?, fuelSurchargeHkd?, surgeFeeHkd?, otherChargesHkd?, notes? }`, `L10-23`)
- **Output**: `Promise<UpsActualCostResult>` (`{ success: boolean, error?: string, releasedDate?: string, appliedExchangeRate?: number, hkdTotal?: number, totalCostKrw?: number, recalc?: { weightOrDimsChanged, newAgencyTotal, newShipperTotal, agencyDelta, shipperDelta } }`, `L25-39, 388-395`)
- **오류**: 권한 불충족(`permission_denied`, `L163`), 오더 미존재(`order_not_found`, `L187`), 비UPS 오더(`not_ups_order`, `L191`), 상태 부적합(`ups_actual_cost_status_invalid`, `L195`), **정산 완료 오더(`cost_settled_locked`, `L258-261`)**, DB upsert/update/인보이스 조정 실패 또는 예외 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: ... }) }` 반환
- **부수효과**: `zen_ups_actual_cost` upsert 및 환율·KRW 원가·계산 스냅샷 업데이트(`L205-240`), 중량/치수 변경 시 `zen_order_costs`(`UPS_ACTUAL_COST_ADJ`) 델타 반영 및 미마감 `zen_invoices` 총액 갱신 또는 마감 인보이스 `createPostFinalizationAdjustment` 호출(`L254-382`), `revalidatePath(\`/orders/\${orderId}\`)`·`revalidatePath(\`/(dashboard)/orders/\${orderId}\`)`·`revalidatePath('/admin/ups-actual-charges')` (`L384-386`)

#### previewUpsActualCost(orderId, input)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:478-558`
- **설명**: DB 저장 없이 UPS 오더(`orderId`)의 출고일 기준 환율, 원가 합계 및 중량/치수 변경에 따른 대리점·화주 매출 재계산 결과(`recalc`)를 미리보기로 산출해 반환합니다. **TASK-B-364(#1374)부터 `recordUpsActualCost`와 동일한 `computeUpsActualCostKrw()` 규칙(기본운임 +7%)을 사용하며**, 청구확정 입력(기본운임 통화 + KRW 유류·급증 + 기타 목록)도 받아 동일 결과를 계산합니다(클라이언트의 자체 가산 계산 제거). **TASK-B-366(#1376): 저장이 없는 미리보기는 정산 완료 오더(`cost_settled_locked`)에도 허용됩니다.**
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (`src/app/actions/finance/ups-actual-cost.ts:408-410`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용)
- **Input**: `orderId: string`, `input: UpsActualCostInput & { baseFreightKrw?, baseFreightCurrency?, fuelSurchargeKrw?, surgeFeeKrw?, otherChargesKrw?, otherCharges?: Array<{ name, amount, currency }> }`
- **Output**: `Promise<UpsActualCostResult>` (`ups-actual-cost.ts:464`)
- **오류**: 권한 불충족(`permission_denied`, `L410`), 오더 미존재(`order_not_found`, `L433`), 비UPS 오더(`not_ups_order`, `L437`), 예외 발생 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L465-468`)

#### recordActualCostAndFinalize(orderId, input)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:562-718`
- **설명**: 개별 UPS 오더(`IN_TRANSIT` 또는 `DELIVERED`)의 통화별 기본운임(`+7%` 원가 할증 반영)·유류할증·급증수수료·기타부가운임을 KRW 기준으로 `zen_ups_actual_cost` 및 `zen_ups_actual_other_charges`에 저장하고, `input.invoiceId`가 있으면 `finalizeInvoice()`를 호출해 인보이스를 즉시 마감합니다 (TASK-B-317 / Issue #1158). **TASK-B-364(#1374)부터 계산은 `computeUpsActualCostKrw()`로 통합**(항목별 통화·기타 목록, 기본운임만 +7%, KRW 기본운임이면 `applied_exchange_rate=1`)되었고, 기타부가운임은 정규화된 목록으로 자식 테이블에 저장됩니다. **TASK-B-366(#1376)부터 정산 완료 오더는 `cost_settled_locked`로 거부하며, 계산 스냅샷(`cost_surcharge_rate`·`cost_surcharge_amount_krw`·`applied_exchange_rates`·`calc_version=2`)을 함께 저장합니다.** **DEF-B-159: 기타부가운임 목록이 비어도 기존 자식 행을 항상 삭제합니다.**
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (`src/app/actions/finance/ups-actual-cost.ts:485-488`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용)
- **Input**: `orderId: string`, `input: UpsActualCostInput & { baseFreightKrw?, fuelSurchargeKrw?, surgeFeeKrw?, otherChargesKrw?, otherCharges?: Array<{ name: string, amount: number, currency: string }>, invoiceId?: string, reason?: string }` (`L474-482`)
- **Output**: `Promise<UpsActualCostResult & { finalized?: boolean }>` (`ups-actual-cost.ts:483, 606-613`)
- **오류**: 프로필 부재(`profile_not_found`), 권한 불충족(`permission_denied`), 오더 미존재(`order_not_found`), 비UPS 오더(`not_ups_order`), 상태 부적합(`billing_finalize_status_invalid`, `L510`), **정산 완료 오더(`cost_settled_locked`, `L602-605`)**, 원가 upsert 실패(`ACTUAL_COST_SAVE`, `L559`), 기타부가운임 저장 실패(`OTHER_CHARGES_SAVE`, `L585`), 예외 발생 시 `logger.error` 후 `{ success: false, error }` 반환 (`invoiceId` 마감 실패 시에는 `logger.warn` 기록 후 `finalized: false`, `success: true`로 비차단 반환 `L595-600`)
- **부수효과**: `zen_ups_actual_cost` upsert(`L534-555`), 기타부가운임 기존 행 **항상 삭제** 후 목록이 있을 때만 재삽입(`L665-688` — DEF-B-159), `input.invoiceId` 존재 시 `finalizeInvoice()` 호출(`L695-704`), `revalidatePath('/(dashboard)/finance/daily-billing', 'page')` 및 `revalidatePath(\`/(dashboard)/orders/\${orderId}\`, 'page')` (`L705-706`)

#### getOrdersForCostSettlement(filter)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:768-851`
- **설명**: 오더정산 대상 목록을 조회합니다(TASK-B-366 / Issue #1376). `DELIVERED` + `UPS` 오더를 대상으로 정산상태(`NOT_SETTLED`/`SETTLED`/`ALL`), 배송완료일 기간(`from`~`to`), 오더번호 검색어(`q`)로 필터링하고, 각 행에 배송완료일·정산상태·정산일시·UPS 청구서번호·실제원가 입력 여부를 담아 반환합니다. 기존 오더별 인보이스(`zen_invoices.metadata.source_order_id`)가 있는 오더는 목록에 **표시하되** `legacyInvoiced=true`·`excludedReason='LEGACY_INVOICED'`로 정산 대상에서 제외합니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (동일 파일 `L770-772`)
- **Input**: `filter: CostSettlementFilter` — `{ status: 'NOT_SETTLED' | 'SETTLED' | 'ALL', from: string, to: string, q?: string }`
- **Output**: `Promise<CostSettlementListResult>` — `{ success, orders?: CostSettlementOrderRow[], total?: number, error?: string }` (`L761-767`)
- **오류**: 권한 불충족(`permission_denied`), 기간 누락·역전(`generic{DATE_RANGE_INVALID}`, `L774-777`), 목록 조회 실패(`generic{ORDER_LIST_LOOKUP}`, `L789-792`), **보조 조회 실패는 fail-open 금지** — 배송완료일 `generic{HISTORY_LOOKUP}`, 원가 `generic{COST_LOOKUP}`, 레거시 인보이스 `generic{LEGACY_INVOICE_LOOKUP}`(`L801-814`), 예외 시 `generic{UNEXPECTED}`. 배송완료일(`order_status_history.next_status='DELIVERED'`)이 없거나 기간 밖인 오더는 결과에서 제외합니다(`L804-812`).

#### markOrderCostSettled(orderId)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:853-921`
- **설명**: UPS 오더를 오더정산 완료 상태로 전환합니다(TASK-B-366 / Issue #1376). `cost_settlement_status`를 `SETTLED`로, `cost_settled_at`·`cost_settled_by`를 기록합니다. 정산 완료 후에는 `recordUpsActualCost`·`recordActualCostAndFinalize`가 원가·중량 수정을 거부합니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (동일 파일 `L841-843`)
- **Input**: `orderId: string`
- **Output**: `Promise<{ success: boolean, settledAt?: string, error?: string }>` (`L840`)
- **오류**: 오더 미존재(`order_not_found`, `L852-855`), 비UPS 오더(`not_ups_order`, `L856`), `DELIVERED` 아님(`ups_actual_cost_status_invalid`, `L857-860`), 이미 정산됨(`already_settled`, `L861-864`), 컷오버일 이전 오더(`legacy_invoiced_order`, `L865-868` — 기준일은 #1369에서 확정, 현재 항상 false인 stub), 원가 미입력(`cost_not_entered`, `L870-874`), 기존 오더별 인보이스 존재(`legacy_invoiced_order`, `L876-884` — 이중청구 방지), 조건부 UPDATE 영향 행 0건(`already_settled`, `L886-899` — 동시 요청 중 1건만 성공)
- **부수효과**: `zen_orders` 조건부 UPDATE(`WHERE id=$1 AND cost_settlement_status='NOT_SETTLED'`), `revalidatePath(\`/(dashboard)/orders/\${orderId}\`, 'page')`·`revalidatePath('/admin/ups-actual-charges')` (`L902-903`)

#### unmarkOrderCostSettled(orderId)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:925-971`
- **설명**: UPS 오더의 오더정산을 되돌립니다(TASK-B-367 / Issue #1377). `cost_settlement_status`를 `NOT_SETTLED`로, `cost_settled_at`·`cost_settled_by`를 `NULL`로 복원합니다. **`zen_billing_statement_items`에 해당 오더가 하나라도 있으면(tier 무관, `order_id` 기준) 청구서 취소가 선행되어야 하며 `statement_includes_order`로 거부합니다.** user-session client(`validateUserAction().supabase`)만 사용해 RLS를 우회하지 않습니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (동일 파일 `L102-109`: `ADMIN_ROLES` = `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용, 호출 `L927-929`)
- **Input**: `orderId: string`
- **Output**: `Promise<{ success: boolean, error?: string }>` (`L925`)
- **오류**: 권한 불충족(`permission_denied`, `L927-929`), 오더 미존재(`order_not_found`, `L932-935`), 정산 상태가 `SETTLED`가 아님(`not_found`, `L936-939`), **청구서 항목 조회 실패는 `generic{STATEMENT_ITEM_LOOKUP}`로 실패 처리(청구서 없음으로 오인 금지 — #1396 수정 1 동일 원칙, `L943-946`)**, 청구서 포함 오더(`statement_includes_order`, `L947-950`), 조건부 UPDATE 실패(`generic{UNMARK_UPDATE}`, `L956-959`), 조건부 UPDATE 영향 행 0건(동시 되돌리기 경합, `not_found`, `L960-963`), 예외 시 `logger.error` + `generic{UNEXPECTED}` (`L967-970`). 실패 분기마다 `logger.warn`/`logger.error`가 원본 오류와 함께 기록됩니다.
- **부수효과**: `zen_orders` 조건부 UPDATE(`WHERE id=$1 AND cost_settlement_status='SETTLED'`, 영향 행 0이면 실패), `revalidatePath(\`/(dashboard)/orders/\${orderId}\`, 'page')`·`revalidatePath('/admin/ups-actual-charges')` (`L964-965`)
- **제약**: "청구서 포함 확인 → UPDATE" 사이에 항목이 삽입될 수 있는 TOCTOU 경합은 **DB 트리거 방어를 IMP로 건의**(R-15 — IMP-198에 덧붙이지 않고 신규 번호 부여). 본 Task에서는 DB 마이그레이션을 추가하지 않습니다.

---

