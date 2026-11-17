### 11.12 Agency 화주 및 구간 할인 관리 Actions (TASK-1159 / Issue #1345)

#### getAgencyOrgIdByShipper(shipperOrgId)
- **Path**: `src/app/actions/agency/shipper-link.ts:6-17`
- **설명**: 화주 조직 ID(`shipperOrgId`)로 연결된 활성 대리점 조직 ID(`zen_agency_shippers.agency_org_id`, `is_active = true`)를 단건 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/agency/shipper-link.ts:7`, 로그인 세션 검증만 수행하며 액션 내 별도 역할·소유권 가드 없음 — 일반 세션 클라이언트를 통해 `zen_agency_shippers` RLS 정책 적용, `DEF-149` 참조)
- **Input**: `shipperOrgId: string` (화주 조직 UUID)
- **Output**: `Promise<string | null>` (연결된 `agency_org_id` 또는 `null`)
- **오류**: 미인증/프로필 부재 시 `Error("Login required")` / `Error("Profile not found")` throw (`validateUserAction`); DB 조회 실패 시 `Error("대리점 조회 실패: ${error.message}")` throw (`shipper-link.ts:15`)

#### getAgencyShippers(agencyOrgId)
- **Path**: `src/app/actions/agency/shippers.ts:118-157`
- **설명**: 특정 대리점(`agencyOrgId`) 소속 화주 연결 목록(`zen_agency_shippers`)과 화주 조직 상세(`shipper:shipper_org_id` 조인)를 생성일 내림차순으로 조회합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/shippers.ts:119-122`, 허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY` — 단, `createAdminClient()`로 RLS를 우회하면서 `agencyOrgId === profile.org_id` 소속 일치 검증이 누락됨, `DEF-149` 참조)
- **Input**: `agencyOrgId: string` (대리점 조직 UUID)
- **Output**: `Promise<{ shippers: AgencyShipperRow[] }>` (`src/types/agency.ts:14-25`)
- **오류**: 미인증(`"Login required"` / `"Profile not found"`), 역할 불충족 시 `Error("Unauthorized access")` throw (`shippers.ts:121`); DB 조회 실패 시 `logger.error` 기록 후 `Error("Failed to fetch agency shippers: ${error.message}")` throw (`shippers.ts:151-154`)

#### createAgencyShipper(agencyOrgId, shipperData)
- **Path**: `src/app/actions/agency/shippers.ts:163-273`
- **설명**: 대리점 소속 신규 화주 계정(Supabase Auth 사용자 + `zen_organizations` + `zen_profiles` + `zen_agency_shippers` 연결)을 생성하고 임시 비밀번호 환영 이메일을 발송합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/shippers.ts:167-170`, 허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY` — `createAdminClient()` 사용 시 `agencyOrgId === profile.org_id` 검증 누락은 `DEF-149` 참조)
- **Input**: `agencyOrgId: string`, `shipperData: CreateAgencyShipperInput` (`CreateAgencyShipperSchema` Zod 검증: `name`, `shipper_type: 'INDIVIDUAL'|'CORPORATE'`, `discount_rate: 0~0.9999`, `login_email`, 법인 시 `biz_no` 필수 등, `src/lib/validations/agency.ts:3-34`)
- **Output**: `Promise<CreateAgencyShipperResult>` (`{ success: true; shipperId: string; inviteEmailSent: boolean } | { success: false; fieldErrors: Record<string, string> }`, `shippers.ts:159-161`)
- **오류**: 역할 불충족 시 `{ success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } }` (`shippers.ts:169`); Zod 검증 실패 시 필드별 오류 맵 반환 (`shippers.ts:173-180`); Auth 생성 실패 시 `{ success: false, fieldErrors: { login_email: authError.message } }` (`shippers.ts:194-196`); 조직/프로필/연결 생성 실패 시 `_rollbackShipper()` 수행 후 `{ success: false, fieldErrors: { _form: '화주 조직/프로필/연결 생성에 실패했습니다.' } }` 반환 (`shippers.ts:235-259`)
- **부수효과**: `supabase.auth.admin.createUser` 호출(`shippers.ts:189`), `sendShipperWelcomeEmail` 발송(실패 시 `logger.warn` 기록 후 비차단 진행, `shippers.ts:201-211`), `syncAuthMetadata`(`role: 'AGENCY_SHIPPER'`, `org_type: 'SHIPPER'`, `shippers.ts:264-269`), `revalidatePath('/agency/shippers')` (`shippers.ts:271`)

#### updateAgencyShipperGrade(id, grade, discountRate)
- **Path**: `src/app/actions/agency/shippers.ts:275-308`
- **설명**: 대리점-화주 연결 행(`zen_agency_shippers.id`)의 등급(`grade`)과 할인율(`discount_rate`)을 수정합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/shippers.ts:280-283`, 허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY` — `createAdminClient()` 사용 시 대상 행의 `agency_org_id === profile.org_id` 검증 및 역마진 가드 미적용은 `DEF-149` 참조)
- **Input**: `id: string` (`zen_agency_shippers.id`), `grade: string` (최대 20자), `discountRate: number` (`0 ~ 0.9999`, `UpdateAgencyShipperGradeSchema`, `src/lib/validations/agency.ts:36-39`)
- **Output**: `Promise<{ success: true }>` (`shippers.ts:307`)
- **오류**: 역할 불충족 시 `Error("Unauthorized access")` throw (`shippers.ts:282`); Zod 검증 실패 시 `Error("Validation failed: ${parsed.error.message}")` throw (`shippers.ts:287`); DB 업데이트 실패 시 `logger.error` 기록 후 `Error("Failed to update shipper grade: ${error.message}")` throw (`shippers.ts:300-303`)
- **부수효과**: `revalidatePath('/agency/shippers')` (`shippers.ts:306`)

#### getAgencyShipperById(shipperId)
- **Path**: `src/app/actions/agency/shippers.ts:310-350`
- **설명**: 대리점-화주 연결 ID(`shipperId`)로 단건 연결 정보 및 화주 조직 상세(`org:shipper_org_id` 주소·담당자 포함)를 조회합니다.
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/shippers.ts:311-314`, 허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY` — `createAdminClient()` 사용 시 `agency_org_id === profile.org_id` 소유권 검증 누락은 `DEF-149` 참조)
- **Input**: `shipperId: string` (`zen_agency_shippers.id`)
- **Output**: `Promise<{ shipper: Record<string, unknown> }>` (`zen_agency_shippers` 단건 + `org` 조인 객체, `shippers.ts:349`)
- **오류**: 역할 불충족 시 `Error("Unauthorized access")` throw (`shippers.ts:313`); DB 조회 실패 시 `logger.error` 기록 후 `Error("Failed to fetch shipper: ${error.message}")` throw (`shippers.ts:344-347`)

#### updateAgencyShipper(shipperId, data)
- **Path**: `src/app/actions/agency/shippers.ts:356-427`
- **설명**: 대리점 소속 화주의 조직 정보(`zen_organizations`)와 연결 설정(`zen_agency_shippers`: `shipper_type`, `discount_rate`, `grade`, `is_active`)을 수정합니다 (`INDIVIDUAL` 유형은 `discount_rate = 0` 강제).
- **권한**: `validateUserAction()` + `checkPermission(profile.role, '/agency')` (`src/app/actions/agency/shippers.ts:360-363`, 허용 역할: `ZENITH_SUPER_ADMIN`, `AGENCY` — `createAdminClient()` 사용 시 `agency_org_id === profile.org_id` 소유권 검증 누락은 `DEF-149` 참조)
- **Input**: `shipperId: string` (`zen_agency_shippers.id`), `data: UpdateAgencyShipperInput` (`UpdateAgencyShipperSchema` Zod 검증, `src/lib/validations/agency.ts:41-70`)
- **Output**: `Promise<UpdateAgencyShipperResult>` (`{ success: true } | { success: false; fieldErrors: Record<string, string> }`, `shippers.ts:352-354, 426`)
- **오류**: 역할 불충족 시 `{ success: false, fieldErrors: { _form: '접근 권한이 없습니다.' } }` 반환 (`shippers.ts:362`); Zod 검증 실패 시 `{ success: false, fieldErrors }` 반환 (`shippers.ts:366-373`); 연결 행 미존재 시 `Error("Shipper not found")` throw (`shippers.ts:386`); 조직/화주 업데이트 실패 시 `Error("Failed to update org/shipper: ...")` throw (`shippers.ts:407, 422`)
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
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:27-277`
- **설명**: UPS 오더(`IN_TRANSIT` 또는 `DELIVERED`)의 추가 실비 청구 항목(`zen_ups_actual_charges`)을 전체 교체 저장하고, 예상 비용 대비 차액(`adjustmentAmount`)을 `zen_order_costs`(`UPS_ACTUAL_ADJUSTMENT`) 및 연결 인보이스(`zen_invoices.total_amount`)에 반영합니다 (마감된 인보이스가 있으면 `createPostFinalizationAdjustment`로 추가 인보이스 발행).
- **권한**: `validateUserAction()` + `assertAdminOrAgency(profile)` (`src/app/actions/finance/ups-actual-charges.ts:20-25, 32-34`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`·`AGENCY` 허용) + `AGENCY`인 경우 `zen_agency_shippers` 활성 연결 화주 소속 검증 (`L54-65` — 단, 대리점 본인 화주 `profile.org_id` 미포함은 `DEF-150` 참조)
- **Input**: `orderId: string` (오더 UUID), `charges: UpsActualChargeInput[]` (`Array<{ chargeType: string, amount: number, currency: string, upsInvoiceNo?: string, upsInvoiceDate?: string, notes?: string }>`, `L8-15`)
- **Output**: `Promise<{ success: boolean; adjustmentAmount?: number; error?: string }>` (`ups-actual-charges.ts:30, 146, 272`)
- **오류**: 권한 불충족(`permission_denied`, `L24`), 오더 미존재(`order_not_found`, `L45`), 비UPS 오더(`not_ups_order`, `L50`), 타 대리점 화주 오더(`shipper_scope_denied`, `L63`), 상태 부적합(`ups_actual_charge_status_invalid`, `L69`), 실비 삭제/삽입·조정 비용 반영·인보이스 금액 갱신·마감 후 조정 실패 또는 예외 발생 시 `logger.error` 기록 후 `{ success: false, error: await trError('generic', { code: ... }) }` 반환
- **부수효과**: `zen_ups_actual_charges` 기존 행 삭제 후 재삽입(`L78-112`), 마감 인보이스 존재 시 `createPostFinalizationAdjustment` 호출(`L133-146`), 미마감 시 `zen_order_costs`(`UPS_ACTUAL_ADJUSTMENT`) upsert/삭제 및 `zen_invoices.total_amount` 갱신(`L150-266`), `revalidatePath(\`/orders/\${orderId}\`)`·`revalidatePath(\`/(dashboard)/orders/\${orderId}\`)`·`revalidatePath('/admin/ups-actual-charges')` (`L268-270`)

#### getUpsActualCharges(orderId)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:279-299`
- **설명**: 특정 UPS 오더(`orderId`)에 등록된 실비 청구 항목 목록(`zen_ups_actual_charges` + `entered_by_profile` 조인)을 등록일 오름차순으로 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/ups-actual-charges.ts:280`, 로그인 세션만 검증하며 액션 내 별도 역할·소유권 가드 없음 — `DEF-150` 참조)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`ups-actual-charges.ts:298`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'ACTUAL_CHARGES_LOOKUP' }))` throw (`L293-296`)

#### getUpsChargeReconciliation(orderId)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:301-364`
- **설명**: 특정 UPS 오더(`orderId`)의 예상 비용 합계(`zen_order_costs`), 실제 청구 합계(`estimated + zen_ups_actual_charges`), 차액(`variance`), 통화 및 인보이스 마감 여부를 대사하여 반환합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/ups-actual-charges.ts:302`, 로그인 세션만 검증하며 액션 내 별도 역할·소유권 가드 없음 — `DEF-150` 참조)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ estimated: number; estimatedBreakdown: Array<{ costType: string; amount: number; currency: string }>; actual: number; variance: number; currency: string; isFinalized: boolean; invoiceNo: string | null; invoiceDate: string | null }>` (`ups-actual-charges.ts:354-363`)
- **오류**: 예상 비용 조회 실패(`ESTIMATED_COST_LOOKUP`, `L311-314`) 또는 실비 조회 실패(`ACTUAL_CHARGES_LOOKUP`, `L333-336`) 시 `logger.error` 후 `Error(await trError('generic', ...))` throw

#### searchDeliveredUpsOrders(query)
- **Path**: `src/app/actions/finance/ups-actual-charges.ts:366-454`
- **설명**: 오더 번호(`order_no`) 또는 운송장 번호(`zen_tracking_configs.tracking_no`) 부분 일치(`ilike`)로 `IN_TRANSIT`·`DELIVERED` 상태의 UPS 오더 목록을 검색합니다.
- **권한**: `validateUserAction()` + `assertAdminOrAgency(profile)` (`src/app/actions/finance/ups-actual-charges.ts:367-369`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`·`AGENCY` 허용) + 1단계(`order_no`) 검색 시 `AGENCY`는 `zen_agency_shippers` 소속 화주 오더만 필터링 (`L398-406` — 단, 2단계 `tracking_no` 검색 결과 병합 시 `AGENCY` 필터 누락 및 대리점 본인 화주 미포함 결함은 `DEF-150` 참조)
- **Input**: `query: string` (공백 제거 후 빈 문자열이면 즉시 `[]` 반환, `L371-372`)
- **Output**: `Promise<Array<Record<string, unknown>>>` (`ups-actual-charges.ts:453`)
- **오류**: 권한 불충족 시 `Error(permErr)` throw (`L369`); 오더 검색 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'ORDER_SEARCH' }))` throw (`L391-394`, 트래킹 번호 조회 에러는 `logger.error`만 기록 후 비차단 진행 `L416-418`)

### 11.14 UPS 실제 원가 확정·정산 마감 Actions (`src/app/actions/finance/ups-actual-cost.ts` — TASK-1162 / Issue #1354)

#### getOrderReleasedDate(supabase, orderId, fallbackCreatedAt?)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:56-69`
- **설명**: `order_status_history`에서 오더(`orderId`)가 `RELEASED` 상태로 전환된 최신 시각(없으면 `fallbackCreatedAt` 또는 당일)을 `YYYY-MM-DD` 문자열로 반환합니다.
- **권한**: **없음 (누락됨)** — `'use server'` 파일에서 `export`되어 있으나 내부 헬퍼 용도로 작성되어 `validateUserAction()` 등 인증/역할 가드가 없음 (`DEF-150` 참조)
- **Input**: `supabase: any` (SupabaseClient), `orderId: string`, `fallbackCreatedAt?: string`
- **Output**: `Promise<string>` (`YYYY-MM-DD`, `ups-actual-cost.ts:68`)
- **오류**: 별도 에러 throw 없이 조회 결과가 없으면 `fallbackCreatedAt` 또는 현재 UTC 날짜(`YYYY-MM-DD`) 반환 (`L66-68`)

#### getUpsActualCost(orderId)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:72-91`
- **설명**: 특정 오더(`orderId`)의 UPS 실제 원가 확정 기록(`zen_ups_actual_cost` + `entered_by_profile` 조인)을 단건 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/ups-actual-cost.ts:73`, 로그인 세션만 검증하며 `assertAdmin` 역할 가드 없음 — `DEF-150` 참조)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<Record<string, unknown> | null>` (`ups-actual-cost.ts:90`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'ACTUAL_COST_LOOKUP' }))` throw (`L86-89`)

#### recordUpsActualCost(orderId, input)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:156-400`
- **설명**: UPS 오더(`IN_TRANSIT` 또는 `DELIVERED`)의 실제 원가(HKD 항목 합계 및 출고일 기준 HKD→KRW 환산 원가)를 `zen_ups_actual_cost`에 Upsert하고, 실측 중량/부피 입력 시 `estimateUpsFreight()`를 재호출해 대리점·화주 인보이스 금액을 연동 재계산합니다 (Issue #1009).
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (`src/app/actions/finance/ups-actual-cost.ts:44-48, 161-163`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용)
- **Input**: `orderId: string`, `input: UpsActualCostInput` (`{ upsInvoiceNo?, upsInvoiceDate?, actualWeightKg?, actualLengthCm?, actualWidthCm?, actualHeightCm?, baseFreightHkd?, baseFreightCurrency?, fuelSurchargeHkd?, surgeFeeHkd?, otherChargesHkd?, notes? }`, `L10-23`)
- **Output**: `Promise<UpsActualCostResult>` (`{ success: boolean, error?: string, releasedDate?: string, appliedExchangeRate?: number, hkdTotal?: number, totalCostKrw?: number, recalc?: { weightOrDimsChanged, newAgencyTotal, newShipperTotal, agencyDelta, shipperDelta } }`, `L25-39, 388-395`)
- **오류**: 권한 불충족(`permission_denied`, `L163`), 오더 미존재(`order_not_found`, `L187`), 비UPS 오더(`not_ups_order`, `L191`), 상태 부적합(`ups_actual_cost_status_invalid`, `L195`), DB upsert/update/인보이스 조정 실패 또는 예외 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: ... }) }` 반환
- **부수효과**: `zen_ups_actual_cost` upsert 및 환율·KRW 원가 업데이트(`L205-240`), 중량/치수 변경 시 `zen_order_costs`(`UPS_ACTUAL_COST_ADJ`) 델타 반영 및 미마감 `zen_invoices` 총액 갱신 또는 마감 인보이스 `createPostFinalizationAdjustment` 호출(`L254-382`), `revalidatePath(\`/orders/\${orderId}\`)`·`revalidatePath(\`/(dashboard)/orders/\${orderId}\`)`·`revalidatePath('/admin/ups-actual-charges')` (`L384-386`)

#### previewUpsActualCost(orderId, input)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:403-469`
- **설명**: DB 저장 없이 UPS 오더(`orderId`)의 출고일 기준 HKD→KRW 적용 환율, 원가 합계 및 중량/치수 변경에 따른 대리점·화주 매출 재계산 결과(`recalc`)를 미리보기로 산출해 반환합니다.
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (`src/app/actions/finance/ups-actual-cost.ts:408-410`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용)
- **Input**: `orderId: string`, `input: UpsActualCostInput`
- **Output**: `Promise<UpsActualCostResult>` (`ups-actual-cost.ts:464`)
- **오류**: 권한 불충족(`permission_denied`, `L410`), 오더 미존재(`order_not_found`, `L433`), 비UPS 오더(`not_ups_order`, `L437`), 예외 발생 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L465-468`)

#### recordActualCostAndFinalize(orderId, input)
- **Path**: `src/app/actions/finance/ups-actual-cost.ts:472-618`
- **설명**: 개별 UPS 오더(`IN_TRANSIT` 또는 `DELIVERED`)의 통화별 기본운임(`+7%` 원가 할증 반영)·유류할증·급증수수료·기타부가운임을 KRW 기준으로 `zen_ups_actual_cost` 및 `zen_ups_actual_other_charges`에 저장하고, `input.invoiceId`가 있으면 `finalizeInvoice()`를 호출해 인보이스를 즉시 마감합니다 (TASK-B-317 / Issue #1158).
- **권한**: `validateUserAction()` + `assertAdmin(profile)` (`src/app/actions/finance/ups-actual-cost.ts:485-488`: `ZENITH_SUPER_ADMIN`·`ADMIN`·`MANAGER`만 허용)
- **Input**: `orderId: string`, `input: UpsActualCostInput & { baseFreightKrw?, fuelSurchargeKrw?, surgeFeeKrw?, otherChargesKrw?, otherCharges?: Array<{ name: string, amount: number, currency: string }>, invoiceId?: string, reason?: string }` (`L474-482`)
- **Output**: `Promise<UpsActualCostResult & { finalized?: boolean }>` (`ups-actual-cost.ts:483, 606-613`)
- **오류**: 프로필 부재(`profile_not_found`), 권한 불충족(`permission_denied`), 오더 미존재(`order_not_found`), 비UPS 오더(`not_ups_order`), 상태 부적합(`billing_finalize_status_invalid`, `L510`), 원가 upsert 실패(`ACTUAL_COST_SAVE`, `L559`), 기타부가운임 저장 실패(`OTHER_CHARGES_SAVE`, `L585`), 예외 발생 시 `logger.error` 후 `{ success: false, error }` 반환 (`invoiceId` 마감 실패 시에는 `logger.warn` 기록 후 `finalized: false`, `success: true`로 비차단 반환 `L595-600`)
- **부수효과**: `zen_ups_actual_cost` upsert(`L534-555`), `zen_ups_actual_other_charges` 기존 삭제 후 재삽입(`L563-588`), `input.invoiceId` 존재 시 `finalizeInvoice()` 호출(`L592-601`), `revalidatePath('/(dashboard)/finance/daily-billing', 'page')` 및 `revalidatePath(\`/(dashboard)/orders/\${orderId}\`, 'page')` (`L603-604`)

---

