# 📡 ZENITH_LMS API Specification (v2.1 Sync)

> **프로젝트:** ZENITH_LMS (지능형 통합 물류 플랫폼)
> **최종 동기화:** 2026-04-27
> **상태:** **Synchronized** (Source Code & DB Schema 기반 전수 조사 완료)

본 문서는 ZENITH_LMS의 **Server Actions (Next.js)** 및 **Supabase RPC (PostgreSQL Functions)** 인터페이스를 정의합니다. 모든 신규 기능 개발 시 본 사양을 진실의 근거(Source of Truth)로 삼습니다.

---

## 1. 인증 및 세션 (Authentication)
사용자 인증 및 초기 세션 처리를 담당합니다.
- **Path**: `src/app/[locale]/(auth)/login/actions.ts`

### login(formData)
- **설명**: 이메일/비밀번호 기반 로그인 처리 및 세션 쿠키 설정
- **Input**: `FormData` (email, password)
- **Output**: `Promise<{ success: boolean, error?: string }>`

### signup(formData, locale)
- **설명**: 신규 사용자(화주/파트너) 가입 요청 처리
- **Input**: `FormData`, `locale` (default: 'ko')
- **Output**: `Promise<{ success: boolean, error?: string }>`

---

## 2. 마스터 데이터 (Master Data)
플랫폼의 기초가 되는 지리, 조직, 코드 정보를 관리합니다.
- **Path**: `src/app/actions/master.ts`

### getPorts()
- **설명**: 전 세계 항구/공항(ZEN_PORTS) 리스트 조회
- **Output**: `Promise<Port[]>`

### upsertPort(payload)
- **설명**: 항구 정보 추가 또는 수정 (Admin 전용)
- **Input**: `Partial<Port>`

### getNations()
- **설명**: 국가 코드 및 지역 정보 리스트 조회
- **Output**: `Promise<Nation[]>`

### getOrganizations()
- **설명**: 화주, 파트너사 등 등록된 모든 조직 정보 조회
- **Output**: `Promise<Organization[]>`

### getAirlines()
- **설명**: 등록된 항공사 마스터 정보 조회
- **Output**: `Promise<Airline[]>`

### getCommonCodesByGroup(groupCode)
- **설명**: 특정 그룹에 속한 공통 코드 리스트 조회 (예: 'PACKING_UNIT', 'TRANS_MODE')
- **Input**: `string`

### upsertCommonCode(payload) / deleteCommonCode(id)
- **설명**: 공통 코드 관리 (Admin 전용)

### getCurrentUserAffiliation()
- **설명**: 현재 로그인한 사용자의 소속 조직 및 권한 정보 조회
- **Output**: `Promise<{ org: Organization, profile: Profile }>`

---

## 3. 오더 관리 (Order Management)
물류 오더(House Order) 및 집행 오더(Master Order)의 생명주기를 관리합니다.
- **Path**: `src/app/actions/orders.ts`

### createOrder(payload)
- **설명**: 신규 하우스 오더 등록 (Header + Packages + Items 동시 처리)
- **Input**: `OrderRegistrationInput` (Zod Schema 검증)
- **Output**: `Promise<Order>`
- **저장 경로**: `create_order_atomic` RPC (v7, `20261113090100_task_b346_create_order_atomic_v7.sql`)
- **주요 Input 필드 — 수하인(Consignee)**: `buildCreateOrderPayload()`가 SHXK createorder `consignee.*`로 매핑하는 필드. 제약은 SHXK 명세(`docs/80_RawData/Phase8_UPS_API_리서치_결과.md` 130~147행) 기준이며, 앱이 명세보다 엄격한 필드는 별도 표기한다.

  | 필드 | 타입 | 필수 | 제약 | SHXK 매핑 | 비고 |
  | :--- | :--- | :-- | :--- | :--- | :--- |
  | `recipient_name` | string | Y | 1~200자 | `consignee.consignee_name` | 수취인 성명. 기본값(폴백) 없음 — 빈 값은 `validateShxkPayload()`가 차단 (TASK-B-346 PR①). 200자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_company` | string | N | 최대 200자 | `consignee.consignee_company` | 수취인 회사명. 빈 값·공백만이면 payload에서 미전송 (TASK-B-346 PR②·PR③) |
  | `recipient_phone` | string | Y | 숫자 15자리 이하 | `consignee.consignee_telephone` | 앱 한도(15)가 SHXK 명세(100)보다 엄격 — UPS E.164 기준 |
  | `recipient_email` | string | N | 이메일 형식, 최대 100자 | `consignee.consignee_email` | 100자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_pccc` | string | N | 최대 50자 | `consignee.consignee_tariff` | 50자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_country_code` | string | N | 최대 2자 (ISO 3166-1 alpha-2) | `consignee.consignee_countrycode` | 2자 초과는 사전검증이 차단 (PR③) |
  | `recipient_state_province` | string | N | 최대 300자 | `consignee.consignee_province` | 300자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_city` | string | N | 최대 300자 | `consignee.consignee_city` | 300자 초과는 폼(zod)·사전검증이 차단 (PR③) |
  | `recipient_address` / `recipient_address_local` | string | N | 전송 street 기준 최대 105자 | `consignee.consignee_street` | 도로명 추출 + 상세주소 결합. 앱 한도(105)가 SHXK 명세(300)보다 엄격 — UPS AddressLine 기준 |
  | `recipient_zipcode` | string | N | 최대 100자 | `consignee.consignee_postcode` | 100자 초과는 폼(zod)·사전검증이 차단 (PR③) |

- **SHXK 명세상 미전송 수하인 필드 (TASK-B-346 PR③ 감사)**: `consignee_district`(300)·`consignee_doorplate`(300)·`consignee_areacode`(10)·`consignee_mobile`(100)·`consignee_fax`(100)·`consignee_certificatetype`·`consignee_certificatecode`(50)·`consignee_credentials_period`(50) 8개는 현재 입력 UI·payload 매핑이 없다. 신규 DB 컬럼·UI가 필요할 수 있는 항목으로, 구현 전 결정 요청 대상 — `scratch/post_launch_improvements.md` IMP-191 참조.

- **DB 컬럼**: `zen_orders.recipient_company` (text, nullable) — 마이그레이션 `20261113090000_task_b346_recipient_company.sql`로 추가. `create_order_atomic` v7이 `p_payload->>'recipient_company'`를 저장.
- **레거시 참고**: `zen_orders.recipient_contact` 컬럼은 조회 전용 레거시로, 본 명세의 수하인 입력/전송 경로에서는 사용하지 않는다.

### getOrders(filters)
- **설명**: 필터 조건에 따른 오더 리스트 조회 (Pagination 지원)
- **Input**: `{ status?, query?, page?, pageSize? }`

### getOrderDetails(orderId)
- **설명**: 특정 오더의 상세 정보 및 패킹/아이템 리스트 조회

### updateOrderStatus(orderId, newStatus)
- **설명**: 상태 머신(Status Machine) 규칙에 따른 오더 상태 변경
- **Validation**: `canChangeStatus` 로직 통과 필수

### createMasterOrder(payload) / dissolveMasterOrder(masterId)
- **설명**: 여러 하우스 오더를 하나의 마스터 오더로 묶거나(Binding) 해제(Dissolve)

### getMasterOrders() / getMasterOrderWithHouses(masterId)
- **설명**: 마스터 오더 목록 및 포함된 하우스 오더 상세 조회

---

## 4. 정산 및 재무 (Finance & Settlement)
비용 계산, 청구서 발행 및 결제 상태를 관리합니다.
- **Path**: `src/app/actions/finance.ts`

### generateInvoicesForOrder(orderId)
- **설명**: 오더 완료(RELEASED) 시 RPC를 호출하여 비용 산출 후 청구서 자동 생성
- **RPC Link**: `calculate_order_costs`

### updatePaymentStatus(invoiceId, status, paidAmount)
- **설명**: 입금 확인 처리 및 연결된 오더의 빌링 상태 동기화
- **Business Logic**: 결제 완료(PAID) 시 원본 오더의 `billing_status`를 'PAID'로 자동 전환

### getSettlementOverview()
- **설명**: 대시보드 및 정산 리스트용 통계 데이터(미결제 합계, 최근 인보이스 등) 조회
- **Output**: `Promise<SettlementSummary>`

### getRevenueReport(filters)
- **설명**: [NEW] 필터 조건(기간, 운송모드, 화주)에 따른 수입 현황 리스트 및 요약 조회
- **Input**: `{ startDate, endDate, transMode?, shipperId? }`
- **Output**: `Promise<{ items: Invoice[], summary: { totalRevenue, count, avgRevenue } }>`

### getCostReport(filters)
- **설명**: [NEW] 필터 조건(기간, 서비스유형)에 따른 비용 현황 리스트 및 요약 조회
- **Input**: `{ startDate, endDate, serviceType? }`
- **Output**: `Promise<{ items: OrderCost[], summary: { totalCost } }>`

### getTransportCosts() / upsertTransportCost(payload) / deleteTransportCost(id)
- **설명**: [NEW] 운송 모드별/구간별 원가(Cost) 마스터 정보 관리 (Admin 전용)
- **Output**: `Promise<TransportCostMaster[]>`

### 4.1 인보이스·세금계산서 발행 및 이력 (`src/app/actions/finance/invoice.ts` — TASK-1162 / Issue #1354)

#### generateInvoiceAction(orderId)
- **Path**: `src/app/actions/finance/invoice.ts:21-33`
- **설명**: 오더(`orderId`)에 대해 `InvoiceGenerator.generateInvoice()`를 호출하여 인보이스를 생성합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:22`, 플랫폼 `ADMIN`·`ZENITH_SUPER_ADMIN` 또는 `/admin` 접근 권한 보유 역할만 허용)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ success: boolean; invoice?: Invoice; message?: string }>` (`invoice.ts:29, 32`)
- **오류**: 미인증/권한 불충족 시 `validateAdminAction()`에서 `redirect('/login')` 또는 `Error("Profile not found")` / `Error("Unauthorized access")` throw (`guards.ts:79-113`); 생성 실패 시 `generator.generateInvoice(orderId)`의 `{ success: false, message }` 반환 (`invoice.ts:32`)
- **부수효과**: `result.success`일 때 `revalidatePath(\`/orders/\${orderId}\`)` 및 `revalidatePath('/finance/invoices')` (`invoice.ts:26-28`)

#### issueInvoicePdf(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:35-107`
- **설명**: 인보이스(`invoiceId`) 정보를 기반으로 PDF 버퍼(`generateInvoicePdfBuffer`)를 생성해 Supabase Storage(`invoices` 버킷)에 업로드하고 발행 이력(`zen_invoice_pdf_history`)을 저장합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:36-37`, 플랫폼 관리자급 권한 필수)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: true; filePath: string }>` (`invoice.ts:106`)
- **오류**: 프로필 부재 시 `Error(await trError('profile_not_found'))` throw (`L37`); 인보이스 미존재/조회 실패 시 `logger.error` 후 `Error(await trError('invoice_not_found'))` throw (`L42-45`); Storage 업로드 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_PDF_UPLOAD' }))` throw (`L83-86`); 이력 저장 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_HISTORY_SAVE' }))` throw (`L100-103`)
- **부수효과**: Supabase Storage `invoices` 버킷에 `${uuid}.pdf` 업로드(`L75-81`), `zen_invoice_pdf_history` 버전(`count + 1`) 행 INSERT(`L88-98`), `revalidatePath('/finance/invoices')` (`L105`)

#### getInvoicePdfHistory(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:109-132`
- **설명**: 인보이스(`invoiceId`)의 PDF 발행 이력 목록을 조회하고 각 파일의 1시간(3,600초) 유효 다운로드 서명 URL(`download_url`)을 생성해 반환합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/invoice.ts:110`, 로그인 세션만 검증하며 액션 내 별도 역할·소유권 검증 없음 — `DEF-150` 참조)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<Array<Record<string, unknown> & { download_url?: string }>>` (`invoice.ts:120-131`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; 이력 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_HISTORY_LOOKUP' }))` throw (`invoice.ts:115-118`)

#### issueTaxInvoice(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:134-224`
- **설명**: 인보이스(`invoiceId`)를 기반으로 부가세율(`VAT_RATE` 파라미터, 기본 `0.1`) 및 환율(`applied_exchange_rate` 또는 당일 USD/KRW 환율)을 적용해 세금계산서(`zen_tax_invoices`, 번호 `TX-YYYYMMDD-NNNN`, 상태 `'ISSUED'`)를 생성합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:135-136`, 플랫폼 관리자급 권한 필수)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: true; taxInvoiceId: string }>` (`invoice.ts:223`)
- **오류**: 프로필 부재 시 `Error(await trError('profile_not_found'))` throw (`L136`); 인보이스 미존재 시 `logger.error` 후 `Error(await trError('invoice_not_found'))` throw (`L141-145`); 세금계산서 INSERT 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'TAX_INVOICE_CREATE' }))` throw (`L205-209`)
- **부수효과**: `zen_tax_invoices` 행 INSERT(`L184-203`), 비동기 best-effort로 `zen_invoice_history`에 `next_status: 'TAX_INVOICE_ISSUED'` 감사 이력 INSERT(실패 시 `logger.error`, `L212-220`), `revalidatePath('/finance/invoices')` (`L222`)

#### sendTaxInvoiceEmail(taxInvoiceId, recipientEmail)
- **Path**: `src/app/actions/finance/invoice.ts:226-280`
- **설명**: 발행된 세금계산서(`taxInvoiceId`) 안내 이메일을 Resend를 통해 수신자(`recipientEmail`)에게 발송하고 발송 상태(`SENT` 또는 `FAILED`)를 갱신합니다.
- **권한**: `validateAdminAction()` (`src/app/actions/finance/invoice.ts:227`, 플랫폼 관리자급 권한 필수)
- **Input**: `taxInvoiceId: string` (세금계산서 UUID), `recipientEmail: string`
- **Output**: `Promise<{ success: true; messageId?: string }>` (`invoice.ts:270`)
- **오류**: 세금계산서 미존재 시 `logger.error` 후 `Error(await trError('invoice_not_found'))` throw (`L232-235`); `RESEND_API_KEY` 미설정(`EMAIL_NOT_CONFIGURED`, `L239-242`) 또는 발송 실패 시 세금계산서 상태를 `'FAILED'`로 업데이트한 뒤 `logger.error` 기록 및 `Error(await trError('generic', { code: 'EMAIL_SEND' }))` throw (`L271-279`)
- **부수효과**: Resend 이메일 발송(`L243-259`), 성공 시 `zen_tax_invoices` 상태 `'SENT'`·`sent_at`·`metadata.resend_id` 업데이트(`L263-267`), 실패 시 상태 `'FAILED'`·`metadata.error` 업데이트(`L272-275`), `revalidatePath('/finance/invoices')` (`L269`)

#### getTaxInvoiceHistory(invoiceId)
- **Path**: `src/app/actions/finance/invoice.ts:282-294`
- **설명**: 특정 인보이스(`invoiceId`)에 대해 발행된 세금계산서 이력 목록을 조회합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/invoice.ts:283`, 로그인 세션만 검증하며 액션 내 별도 역할·소유권 가드 없음 — `DEF-150` 참조)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<TaxInvoice[]>` (`invoice.ts:293`)
- **오류**: 미인증 시 `validateUserAction` 예외 throw; DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'INVOICE_HISTORY_LOOKUP' }))` throw (`invoice.ts:288-291`)

### 4.2 정산 산출·마감·사후조정·거부 (`src/app/actions/finance/settlement.ts` — TASK-1162 / Issue #1354)

#### finalizeInvoice(invoiceId, reason?)
- **Path**: `src/app/actions/finance/settlement.ts:141-211`
- **설명**: 인보이스(`invoiceId`)에 연결된 `zen_order_costs` 합계를 재계산(`computeInvoiceTotal`)하여 정산 마감(`is_finalized: true`, `finalized_at`, `finalized_by`, `finalized_reason`) 처리하고 감사 이력 기록 및 화주 이메일 알림을 발송합니다.
- **권한**: `validateUserAction()` + `assertFinalizePermission()` (`src/app/actions/finance/settlement.ts:79-103, 146-166`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN`은 전체 허용하되 `reason` 입력 필수(`L162-166`), `AGENCY`는 `metadata.source_order_id` 오더의 `shipper_id`가 `resolveAgencyShipperIds`(소속 화주 + 대리점 본인)에 포함될 때만 허용)
- **Input**: `invoiceId: string` (인보이스 UUID), `reason?: string` (관리자 마감 시 필수 사유)
- **Output**: `Promise<{ success: boolean; error?: string }>` (`settlement.ts:144, 206`)
- **오류**: 모든 실패 분기에서 `trError()` 로케일 문자열을 `{ success: false, error }`로 반환 — 프로필 부재(`profile_not_found`, `L147`), 인보이스 미존재(`invoice_not_found`, `L152`), 이미 마감됨(`invoice_already_finalized`, `L156`), 권한 없음/타 소속 화주(`permission_denied` / `own_shipper_only` / `not_found`, `L85-100`), 관리자 사유 누락(`invoice_finalize_reason_required`, `L165`), 비용 조회/마감 DB 실패 또는 예외 시 `logger.error` 후 `generic`(`UNEXPECTED`, `L207-210`) 반환
- **부수효과**: `zen_invoices` 마감 필드 업데이트(`L126`), `zen_invoice_history` 이력 INSERT(`L132-138`), 화주(`role='SHIPPER'`, `status='ACTIVE'`)에게 `sendInvoiceFinalizedEmail` 발송(실패 시 `logger.error` 후 비차단, `L172-201`), `revalidatePath('/finance/invoices')` 및 `revalidatePath('/(dashboard)/settlement')` (`L203-204`)

#### calculateSettlementAction(orderId)
- **Path**: `src/app/actions/finance/settlement.ts:287-345`
- **설명**: 오더(`orderId`)의 정산 비용을 `SettlementEngine.calculateOrderCosts()`로 산출하고 산출된 `zen_order_costs` 목록을 반환합니다 (이미 인보이스에 연결된 비용 행이 있으면 재계산 차단).
- **권한**: `validateUserAction()` + 인라인 역할 검사 (`src/app/actions/finance/settlement.ts:289-311`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 `resolveAgencyShipperIds` 소속 화주 오더만 허용)
- **Input**: `orderId: string` (오더 UUID)
- **Output**: `Promise<{ success: boolean; costs?: OrderCost[]; message?: string }>` (`settlement.ts:341, 344`)
- **오류**: 프로필 부재(`profile_not_found`, `L290`), 역할 불충족(`permission_denied`, `L296`), 타 소속 화주 오더(`own_shipper_only`, `L309`), 기존 비용 조회 실패(`generic: COST_LOOKUP`, `L319`), 인보이스 연결로 잠긴 오더(`settlement_recalc_locked`, `L323`) 시 `Error` throw; 엔진 실패 시 `{ success: false, message }` 반환 (`L344`)
- **부수효과**: `SettlementEngine.calculateOrderCosts(orderId)` 실행으로 `zen_order_costs` 생성/갱신(`L327`), 성공 시 `revalidatePath(\`/orders/\${orderId}\`)` (`L340`)

#### getWeeklyRevenueChart()
- **Path**: `src/app/actions/finance/settlement.ts:372-417`
- **설명**: 최근 7일간 결제 완료(`PAID`)된 인보이스 금액을 요일(`Sun`~`Sat`)별로 집계해 주간 매출 차트 데이터를 반환합니다.
- **권한**: `validateUserAction()` (`src/app/actions/finance/settlement.ts:373-378`: `ZENITH_SUPER_ADMIN`·`ADMIN`은 전체 조회, 그 외 역할은 `shipperId = profile.org_id`로 본인 조직분만 조회 — 단, `MANAGER` 역할이 `isAdmin`에서 누락된 점은 `DEF-150` 참조)
- **Input**: 없음 (`()`)
- **Output**: `Promise<Array<{ name: string; revenue: number }>>` (`settlement.ts:411-416`)
- **오류**: 프로필 부재 시 `Error(await trError('profile_not_found'))` throw (`L374`); DB 조회 실패 시 `logger.error` 후 `Error(await trError('generic', { code: 'REVENUE_CHART_LOOKUP' }))` throw (`L390-393`)

#### addManualOrderCost(orderId, costName, amount, currency)
- **Path**: `src/app/actions/finance/settlement.ts:478-554`
- **설명**: 인보이스 확정 전 오더(`orderId`)에 수동 매출 비용 항목(`zen_order_costs`, `cost_type: 'OTHER_CHARGE'`, `is_revenue: true`, `quantity: 1`)을 추가합니다.
- **권한**: `validateUserAction()` + 인라인 역할 검사 (`src/app/actions/finance/settlement.ts:485-517`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 `resolveAgencyShipperIds` 소속 화주 오더만 허용)
- **Input**: `orderId: string`, `costName: string` (비공백 필수), `amount: number` (`> 0` 필수), `currency: string` (필수)
- **Output**: `Promise<{ success: true }>` (`settlement.ts:553`)
- **오류**: 프로필 부재(`profile_not_found`), 입력 검증 실패(`cost_name_required` / `cost_amount_invalid` / `cost_currency_required`, `L488-490`), 권한 불충족(`permission_denied` / `own_shipper_only`, `L497, 515`), 이미 인보이스에 연결된 비용이 존재할 때(`settlement_items_locked`, `L529`), DB insert 실패(`generic: COST_INSERT`, `L547`) 시 `Error` throw
- **부수효과**: `zen_order_costs` 행 INSERT(`L534-543`), `revalidatePath(\`/orders/\${orderId}\`)` 및 `revalidatePath(\`/(dashboard)/orders/\${orderId}\`)` (`L550-551`)

#### createPostFinalizationAdjustment(orderId, adjustmentAmount, currency, userId, originalInvoiceId)
- **Path**: `src/app/actions/finance/settlement.ts:558-596`
- **설명**: 이미 정산 마감(`is_finalized = true`)된 인보이스(`originalInvoiceId`)에 대해 사후 조정 차액(`adjustmentAmount !== 0`)이 발생한 경우, 신규 조정 인보이스(`zen_invoices`, `metadata.adjustment_of = origInv.id`)를 발행하고 미연결 `UPS_ACTUAL_ADJUSTMENT` 비용 행을 연결합니다 (TASK-194-C).
- **권한**: `validateAdminAction()` (`src/app/actions/finance/settlement.ts:563`, 플랫폼 관리자급 권한 필수)
- **Input**: `orderId: string`, `adjustmentAmount: number`, `currency: string`, `userId: string`, `originalInvoiceId: string`
- **Output**: `Promise<{ success: boolean; adjustmentAmount?: number; error?: string }>` (`settlement.ts:561, 591`)
- **오류**: 원본 인보이스 미존재(`invoice_not_found`, `L568`), 조정 인보이스 생성 실패(`invoice_create_failed`, `L578`), 미인증/권한 거부 또는 예외 발생 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L592-595`)
- **부수효과**: `adjustmentAmount !== 0`일 때 신규 `zen_invoices` INSERT(`createAdjustmentInvoice`, 만기 +14일, `L575`), 미연결 `UPS_ACTUAL_ADJUSTMENT` 비용 행의 `invoice_id` 연결 및 총액 재산출 업데이트(`L580-582`), `zen_invoice_history` 이력 INSERT(`L583-586`), `revalidatePath(\`/orders/\${orderId}\`)` 및 `revalidatePath('/finance/invoices')` (`L589-590`)

#### rejectInvoice(invoiceId)
- **Path**: `src/app/actions/finance/settlement.ts:633-697`
- **설명**: 인보이스(`invoiceId`)를 취소(`status: 'CANCELED'`, `is_finalized: false`)하고 연결된 비용(`zen_order_costs.invoice_id`)을 해제한 뒤, 원본 오더가 존재하면 새 인보이스를 자동 재발행하여 기존 인보이스 `metadata.superseded_by`에 기록합니다 (TASK-194-C).
- **권한**: `validateUserAction()` + `assertFinalizePermission()` (`src/app/actions/finance/settlement.ts:637-652`: `ADMIN`·`MANAGER`·`ZENITH_SUPER_ADMIN` 전체 허용, `AGENCY`는 소속 화주 오더 인보이스만 허용)
- **Input**: `invoiceId: string` (인보이스 UUID)
- **Output**: `Promise<{ success: boolean; newInvoiceId?: string; error?: string }>` (`settlement.ts:635, 692`)
- **오류**: 프로필 부재(`profile_not_found`, `L638`), 인보이스 미존재(`invoice_not_found`, `L644`), 이미 취소됨(`invoice_already_canceled`, `L648`), 권한 불충족(`permErr`, `L652`), 취소 업데이트 실패(`generic: INVOICE_CANCEL`, `L661`), 기타 예외 시 `logger.error` 후 `{ success: false, error: await trError('generic', { code: 'UNEXPECTED' }) }` 반환 (`L693-696`)
- **부수효과**: 기존 `zen_invoices` `'CANCELED'` 업데이트 및 `zen_invoice_history` 취소 이력 INSERT(`L656-667`), `zen_order_costs.invoice_id = null` 연결 해제(`L670-671`), `InvoiceGenerator.generateInvoice(orderId)`로 신규 인보이스 생성·`superseded_by` 기록·신규 이력 INSERT(`L675-688`), `revalidatePath('/finance/invoices')` 및 `revalidatePath(\`/orders/\${orderId}\`)` (`L690-691`)

---

## 5. 인벤토리 관리 (Inventory Management)
조직별 SKU 기반 재고 현황 및 변동 이력을 관리합니다.
- **Path**: `src/app/actions/inventory.ts`

### getInventoryList(filters)
- **설명**: 조직별 재고 현황 목록 조회 (Pagination, 검색, 저재고 필터 지원)
- **Input**: `{ page?, pageSize?, search?, lowStockOnly? }`
- **Output**: `Promise<{ items: Inventory[], totalCount: number }>`

### getInventoryStats()
- **설명**: [NEW] 대시보드용 재고 통계 요약 (전체 SKU, 저재고 품목 수, 품절 품목 수 등)
- **Output**: `Promise<{ totalSku: number, lowStockCount: number, outOfStockCount: number }>`

### getInventoryHistory(inventoryId)
- **설명**: 특정 품목의 상세 입출고/조정 이력 조회
- **Output**: `Promise<InventoryHistory[]>`

### upsertInventoryItem(payload)
- **설명**: [NEW] SKU 기반 재고 품목 생성 또는 정보(최소 재고 수량 등) 수정
- **Input**: `Partial<Inventory> & { sku_code: string }`

### adjustInventory(payload)
- **설명**: 관리자에 의한 수동 재고 수량 조정 (조정 사유 필수)
- **Input**: `{ inventoryId, adjustmentQty, reason }`
- **Validation**: `adjustmentQty`가 음수일 경우 현재고보다 클 수 없음

### syncInventoryFromOrder(orderId, status, itemDiff?)
- **설명**: [Internal] 오더 상태 변화에 따른 재고 자동 동기화 (예약/출고/취소/수정)

---

## 6. 실시간 트래킹 (Tracking)
화물의 이동 경로 및 상태 변경 이벤트를 관리합니다.
- **Path**: `src/app/actions/tracking.ts`

### getTrackingEvents(orderId)
- **설명**: 특정 오더의 전체 트래킹 히스토리 조회
- **Output**: `Promise<TrackingEvent[]>`

### addTrackingEvent(orderId, payload)
- **설명**: [Admin] 신규 트래킹 이벤트 수동 등록 (또는 Webhook 연동)
- **Input**: `orderId`, `{ event_code, location, description, event_time? }`

### updateTrackingConfig(orderId, providerType, providerName?)
- **설명**: [Admin] 오더의 트래킹 Provider 설정을 변경 (VIRTUAL, MANUAL, API)

### syncExternalTracking()
- **설명**: [Admin/System] API 공급자가 설정된 모든 활성 트래킹 데이터를 일괄 동기화
- **Process**: `TrackingManager.getTrackingData` 호출 및 오더 상태 자동 동기화

### refreshTrackingData(orderId)
- **설명**: 특정 오더의 트래킹 데이터를 강제로 외부 API와 동기화
- **Input**: `orderId`
- **Output**: `Promise<{ success: boolean, count?: number, error?: string }>`

### getTrackingRawLogs(orderId)
- **설명**: [Admin] 문제 발생 시 디버깅을 위한 원본(Raw JSON) 응답 내역 조회
- **Output**: `Promise<RawLog[]>`

### getGlobalTrackingOverview()
- **설명**: 대시보드용 전체 트래킹 현황 요약 조회 (최신 이벤트 포함)
- **Output**: `Promise<TrackingOverview[]>`

---

## 7. Supabase RPC (Database Functions)
복잡한 로직이나 대량 데이터 연산이 필요한 경우 호출되는 DB 함수입니다.

| 함수명 | 인자(Arguments) | 반환형 | 설명 |
| :--- | :--- | :--- | :--- |
| `approve_organization` | `target_org_id (uuid)` | `text` | 신규 조직 승인 및 관리자 프로필 생성 |
| `reject_organization` | `target_org_id, comment` | `boolean` | 가입 거절 및 사유 기록 |
| `request_organization_supplement` | `target_org_id, comment` | `boolean` | 서류 보완 요청 |
| `calculate_order_costs` | `p_order_id (uuid)` | `jsonb` | TISA 엔진 기반 운임 산출 및 항목 기록 |
| `get_orders_aggregation` | `order_ids (uuid[])` | `TABLE` | 마스터 결합용 중량/부피 합산 |
| `fn_get_best_matching_rate` | `carrier_id, origin, dest, etc.` | `TABLE` | 최적 요율 카드 매칭 |
| `generate_master_order_no` | `None` | `text` | M-YYMMDD-NNNN 형식 번호 생성 |
| `get_next_order_sequence` | `p_year, p_prefix` | `text` | 시퀀스 기반 오더 번호 생성 |

---


## 8. 선불 지갑 관리 (Wallet Management)
화주 조직의 자금 충전, 환불 및 인보이스 결제를 관리합니다.
- **Path**: `src/app/actions/wallet.ts`

### getWalletBalance(orgId)
- **설명**: 특정 조직의 지갑 잔액 및 통화 정보 조회 (최초 접근 시 자동 생성)
- **Input**: `orgId (uuid)`
- **Output**: `Promise<{ balance: number, currency: string, updatedAt: string }>`

### topUpWallet(orgId, amount, description?)
- **설명**: 지갑 잔액 충전 (Admin 전용)
- **Input**: `orgId`, `amount (number)`, `description?`
- **Output**: `Promise<ActionResult>`

### requestRefund(walletId, amount, description?)
- **설명**: 지갑 잔액 환불 요청 (PENDING 상태로 거래 생성)
- **Input**: `walletId`, `amount`, `description?`
- **Output**: `Promise<ActionResult>`

### payInvoiceFromWallet(invoiceId)
- **설명**: 지갑 잔액을 사용하여 인보이스 결제 처리 (원자적 트랜잭션)
- **Input**: `invoiceId (uuid)`
- **Output**: `Promise<ActionResult>`
- **Error**: `INSUFFICIENT_BALANCE` (잔액 부족 시)

---

## 9. 운항 스케줄 (Vessel Schedules)
해상/항공 운항 스케줄 정보를 관리 및 조회합니다.
- **Path**: `src/app/actions/schedules.ts`

### getVesselSchedules(filters)
- **설명**: [NEW] 출발/도착지 및 기간별 운항 스케줄 조회
- **Input**: `{ originPortId?, destinationPortId?, startDate?, endDate? }`
- **Output**: `Promise<VesselSchedule[]>`

### upsertVesselSchedule(payload) / deleteVesselSchedule(id)
- **설명**: [NEW] 스케줄 정보 관리 (Admin 전용)

---

## 10. 통계 및 분석 (Statistics & Analytics)
플랫폼 내 물동량, 매출, 수익성 지표를 시각화하기 위한 데이터를 제공합니다.
- **Path**: `src/app/actions/statistics.ts`

### getCostProfitStats(period)
- **설명**: [NEW] 특정 기간('WEEK', 'MONTH', 'YEAR') 동안의 운송 모드별 매출/비용/수익/이익률 통계 조회
- **Input**: `'WEEK' | 'MONTH' | 'YEAR'`
- **Output**: `Promise<{ statsByMode: Array<{ mode, revenue, cost, profit, margin }> }>`


---

## 15. 고객지원 (Support & VOC)
1:1 문의, FAQ, 공지사항 기능을 제공합니다.
- **Path**: `src/app/actions/support.ts`

### createQna(payload)
- **설명**: 신규 1:1 문의를 등록합니다. 오더와 연계 가능합니다.
- **Input**: `{ title: string, content: string, order_id?: string }`
- **Business Logic**: 
  - `order_id` 존재 시 해당 오더의 소유권(org_id 일치 여부) 검증
  - 성공 시 `PENDING` 상태로 등록 및 Admin 알림 발송

### getQnaList(filters)
- **설명**: 문의 목록을 조회합니다. 화주는 본인 조직의 것만, Admin은 전체 조회 가능합니다.
- **Input**: `{ status?, order_id?, limit?, offset? }`

### getQnaDetail(qnaId)
- **설명**: 문의 상세 내용 및 답변 이력을 조회합니다.

### answerQna(payload)
- **설명**: [Admin] 문의에 대한 답변을 등록하고 상태를 변경합니다.
- **Input**: `{ qnaId, content, isFinal? }`

### getOrderQnaList(orderId)
- **설명**: 특정 오더에 종속된 문의 목록만 조회합니다.

### upsertFaq(payload) / getFaqList(filters) / deleteFaq(id)
- **설명**: FAQ(자주 묻는 질문) 관리 및 조회

### upsertNotice(payload) / getNoticeList(filters) / deleteNotice(id)
- **설명**: 공지사항 관리 및 조회

---

## 18. 클레임 관리 (Claims & Incident Fees)
오더 진행 중 발생하는 파손, 분실, 지연 등에 대한 클레임 및 사고 비용을 관리합니다.
- **Path**: `src/app/actions/claims.ts`

### getClaims(filters)
- **설명**: 필터 조건(상태, 오더번호, 기간)에 따른 클레임 목록 조회
- **Input**: `{ status?, orderNo?, startDate?, endDate? }`
- **Output**: `Promise<Claim[]>`

### createClaim(payload)
- **설명**: 신규 클레임 등록 및 오더 상태를 'CLAIMED'로 자동 변경
- **Input**: `{ orderId, reasonCode, description }`
- **Business Logic**: 성공 시 `zen_orders.status`를 'CLAIMED'로 업데이트

### updateClaimStatus(claimId, status)
- **설명**: [Admin] 클레임 진행 상태(OPEN, INVESTIGATING, RESOLVED, CLOSED) 변경
- **Input**: `claimId`, `status`

### processIncidentFee(payload)
- **설명**: [Admin] 확정된 클레임 금액을 사고비(Incident Fee)로 등록하고 연계 인보이스에 반영
- **Input**: `{ claimId, feeAmount, currency, invoiceId?, description }`
- **Business Logic**: `zen_incident_fees` 등록 및 인보이스 `total_amount` 차감 반영

---

## 19. 다국어 문서 엔진 (Document Engine)
무역 필수 서류(CI, PL)를 다국어로 생성하고 관리합니다.
- **Path**: `src/app/actions/finance.ts` (또는 `documents.ts`)

### getOrderDocumentData(orderId)
- **설명**: 특정 오더의 CI/PL 생성을 위한 통합 데이터(오더, 패킹, 아이템, 화주정보) 조회
- **Input**: `orderId (uuid)`
- **Output**: `Promise<DocumentData>`

### CommercialInvoicePDF
- **설명**: `@react-pdf/renderer`를 사용하여 상업송장 PDF 템플릿 제공
- **Features**: Invoice No, Date, Shipper/Consignee, Goods Description, Qty, Amount 등

### PackingListPDF
- **설명**: `@react-pdf/renderer`를 사용하여 패킹리스트 PDF 템플릿 제공
- **Features**: PL No, Date, Mark & No, Description, G.W/N.W, CBM 등

---

## 21. 모니터링 및 로깅 (Monitoring & Logging)
시스템의 안정성을 위한 에러 로깅 및 모니터링 정보를 관리합니다.
- **Path**: `src/app/actions/monitoring.ts`

### logClientError(payload)
- **설명**: 클라이언트 사이드에서 발생한 에러를 DB(`zen_error_logs`)에 기록하고, 중대 에러 시 관리자 알림을 발송합니다.
- **Input**: `{ message: string, stack?: string, url?: string, severity?: 'WARNING'|'ERROR'|'CRITICAL' }`
- **Business Logic**: 
  - `zen_error_logs` 테이블에 INSERT (error_type: 'CLIENT')
  - `severity === 'CRITICAL'`인 경우 `zen_notifications` 테이블에 ADMIN 대상 인앱 알림 자동 생성

### getErrorLogs(filters)
- **설명**: [Admin] 필터 조건에 따른 에러 로그 목록을 조회합니다. (최신순, Pagination 지원)
- **Input**: `{ severity?, resolved?, page?, pageSize? }`
- **Output**: `Promise<{ items: ErrorLog[], totalCount: number }>`

### resolveErrorLog(logId)
- **설명**: [Admin] 에러 로그의 해결 상태(`resolved`)를 `true`로 변경합니다.
- **Input**: `logId (uuid)`

---

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

## ⚠️ 확인된 사항 (Findings & Gaps)
... (생략)

### 1. 인벤토리(Inventory) 모듈 상태
- **현재 구현**: 백엔드(DB Schema, Server Actions) 구현 완료 및 오더 시스템 연동 완료.
- **UI 상태**: `/inventory` 관리 화면 개발 진행 중 (Phase 2.2 확장).
- **작동 방식**: SKU 기반으로 `on_hand_qty`, `reserved_qty`, `available_qty` 관리.

### 2. RPC 파라미터 불일치 수정
- `approve_organization` 함수가 문서상에는 3개의 인자를 받는 것으로 되어 있었으나, 실제 DB에는 `target_org_id` 하나만 받는 것으로 확인되어 사양을 수정하였습니다.

### 3. 소스코드 누락 항목
- `master.ts` 내의 공통 코드 관리(`CommonCode`) API 4종이 문서에 누락되어 추가되었습니다.
- `orders.ts` 내의 마스터 오더 상태 업데이트 및 상세 조회 API가 추가되었습니다.
